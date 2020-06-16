
//TODO: quantities of a variant of a product updated from product schema
const socketioJwt = require('socketio-jwt')
const { SOCKETIO_JWT_SECRET } = require('../config')

const StreamModel = require('../models/stream')
const CartModel = require('../models/cart')
const ProductModel = require('../models/product')

const eventKeys = require('./event_keys.io')
const storages = require('./storage')
const services = require('./services')

let io = null

const initIoServer = server => {
    io = require('socket.io')(server, {
        pingInterval: process.env.SOCKETIO_CALLBACK_SECS * 1000,
        pingTimeout: process.env.SOCKETIO_CALLBACK_SECS * 500,
    })

    /** "One round trip" authorization **/
    io.use(socketioJwt.authorize({
        secret: SOCKETIO_JWT_SECRET,
        handshake: true,
        callback: process.env.SOCKETIO_CALLBACK_SECS * 1000
    }))

    io.on('connection', socket => {
        const userId = socket.decoded_token.userId
        const storeId = socket.decoded_token.storeId || null

        console.log(`user ${userId} connected`)
        socket.emit(eventKeys.SERVER_MESSAGE, messageObject('message', `hello ${userId}`))

        socket.on(eventKeys.USER_JOIN_STREAM, streamId => {
            StreamModel.findById(streamId).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'streamId is invalid'))
                } else {
                    console.log(`user ${userId} is joining stream ${streamId}`)
                    userJoinsStream(socket, streamId)
                    //Get productIds 
                    let prodIds = []
                    stream.products.forEach(prod => {
                        prodIds.push(prod.productId)
                    })

                    let streamObject = stream.toObject()

                    ProductModel.find({
                        '_id': { $in: prodIds }
                    }).then(rows => {
                        rows.forEach((r, idx) => {
                            const rObj = r.toObject()
                            streamObject['products'][idx] = { ...streamObject['products'][idx], ...rObj }
                        })
                        socket.emit(eventKeys.STREAM_INIT, streamObject)
                    }).catch(error => {
                        console.log('get product db stream init error: ', error)
                        socket.emit(eventKeys.STREAM_INIT, streamObject)
                    })
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, messageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on(eventKeys.SELLER_START_STREAM, () => {
            const streamId = services.getStreamByUserId(userId)
            if (!streamId) {
                return socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'you must join a stream first'))
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'streamId is invalid for you, seller!'))
                } else {
                    if (streamId !== stream._id.toString()) {
                        return socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'seller streaming flow is broken: you must use "join the stream" event before start the stream'))
                    }
                    services.newStreamSession(streamId)
                    stream.endTime = Number.MAX_SAFE_INTEGER
                    stream.save()
                    emitToStream(streamId, eventKeys.SELLER_START_STREAM, "")
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, messageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on(eventKeys.SELLER_END_STREAM, () => {
            const streamId = services.getStreamByUserId(userId)
            if (!streamId) {
                return socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'you must join a stream first'))
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'streamId is invalid for you, seller!'))
                } else {
                    if (streamId !== stream._id.toString()) {
                        return socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'seller streaming flow is broken: you must use "join the stream" event before start the stream'))
                    }
                    //Archive the stream
                    stream.messages = storage.streamSessions.get(streamId).messages
                    stream.endTime = Date.now()
                    stream.save()
                    emitToStream(streamId, eventKeys.SELLER_END_STREAM, "")
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, messageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on(eventKeys.USER_ADD_MESSAGE, msg => {
            const streamId = services.getStreamByUserId(userId)
            if (streamId) {
                let stream = storages.streamSessions.get(streamId)
                let payload = {
                    userId,
                    inStreamAt: Date.now(),
                    message: msg
                }
                stream.messages.push(payload)
                storages.streamSessions.set(streamId, stream)
                emitToStream(streamId, eventKeys.STREAM_CHAT_MESSAGE, payload)
            } else {
                socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', 'you have not joined any stream yet'))
            }
        })

        socket.on(eventKeys.SELLER_SET_CURRENT_PRODUCT_INDEX, productIndex => {
            const streamId = services.getStreamByUserId(userId)
            if (streamId) {
                if (storages.streamSessions.has(streamId)) {
                    let strm = storages.streamSessions.get(streamId)
                    strm['currentProductIndex'] = productIndex
                    storages.streamSessions.set(streamId, strm)
                    emitToStream(streamId, eventKeys.STREAM_UPDATE_CURRENT_PRODUCT_INDEX, productIndex)
                }
            }
        })

        socket.on(eventKeys.SELLER_GET_PUBLISH_TOKEN, () => {
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    return socket.emit(eventKeys.STREAM_MESSAGE, messageObject('error', `the stream is not live OR invalid streamId for you, seller!`))
                }
                const tok = services.generateStreamToken(stream._id.toString(), true)
                socket.emit(eventKeys.STREAM_UPDATE_PUBLISH_TOKEN, tok)
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, messageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
            const streamId = services.getStreamByUserId(userId)
            if (streamId) {
                socket.leave(streamId)
                services.removeStreamWithUserId(userId)
            }
        })

    })
}

const userJoinsStream = (socket, streamId) => {
    try {
        const userId = socket.decoded_token.userId
        const oldStreamId = services.getStreamByUserId(userId)
        oldStreamId && socket.leave(oldStreamId)
        services.setStreamWithUserId(userId, streamId)
        socket.join(streamId)
        //socket.emit(eventKeys.STREAM_MESSAGE, socket)
        emitToStream(streamId, eventKeys.STREAM_MESSAGE, messageObject('message', `${userId} joined the stream`))
    }
    catch (error) {
        console.log(error)
        emitToStream(streamId, eventKeys.SERVER_MESSAGE, messageObject('error', `error: ${error}`))
    }
}

const emitToStream = (streamId, eventKey, payload) => {
    if (io !== null) {
        io.to(streamId).emit(eventKey, payload)
        return true
    }
    return false
}

const emitUpdateProductQuantities = (streamId, productId, variantArray) => {
    let variantQuantities = []
    variantArray.forEach(v => {
        variantQuantities.push(v.quantity)
    })
    const obj = { productId, variantQuantities }
    return emitToStream(streamId, eventKeys.STREAM_PRODUCT_QUANTITIES, obj)
}

const messageObject = (type, message) => {
    return {
        type,
        message
    }
}

module.exports = {
    initIoServer,
    emitToStream,
}
