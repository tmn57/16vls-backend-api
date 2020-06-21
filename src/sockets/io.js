
//TODO: quantities of a variant of a product updated from product schema
const socketioJwt = require('socketio-jwt')
const { SOCKETIO_JWT_SECRET, STREAM_ENDTIME_MINIMUM_TIMESTAMP } = require('../config')

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
        socket.emit(eventKeys.SERVER_MESSAGE, toMessageObject('message', `hello ${userId}`))

        socket.on(eventKeys.USER_JOIN_STREAM, (streamId, cb) => {
            StreamModel.findById(streamId).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid' })
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
                        cb({ success: true, data: streamObject })
                        const streamStatusObj = toStreamStatusObject(streamObject)
                        socket.emit(eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    }).catch(error => {
                        console.log('get product db stream init error: ', error)
                        cb({ success: false, message: `error: internal server error: ${error}` })
                    })
                }
            }).catch(error => {
                cb({ success: false, message: `error: internal server error: ${error}` })
            })
        })

        socket.on(eventKeys.SELLER_START_STREAM, (p, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (!streamId) {
                cb({ success: false, message: 'error: you must join a stream first' })
                return;
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid for you, seller!' })
                } else {
                    if (streamId !== stream._id.toString()) {
                        cb({ success: false, message: 'error: seller streaming flow is broken: you must use "join the stream" event before start the stream' })
                    }
                    services.newStreamSession(stream)
                    stream.endTime = Number.MAX_SAFE_INTEGER
                    stream.save()
                    const streamStatusObj = toStreamStatusObject(stream)
                    emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    cb({ success: true })
                }
            }).catch(error => {
                cb({ success: false, message: `error: internal server error: ${error}` })
            })
        })

        socket.on(eventKeys.SELLER_END_STREAM, (p, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (!streamId) {
                cb({ success: false, message: 'error: you must join a stream first' })
                return;
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid for you, seller!' })
                } else {
                    if (streamId !== stream._id.toString()) {
                        cb({ success: false, message: 'error: seller streaming flow is broken: you must use "join the stream" event before start the stream' })
                    }
                    //Archive the stream
                    stream.messages = storage.streamSessions.get(streamId).messages
                    stream.endTime = Date.now()
                    stream.save()
                    const streamStatusObj = toStreamStatusObject(stream)
                    emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    cb({ success: true })
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, toMessageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on(eventKeys.USER_ADD_MESSAGE, (msg, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
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
                cb({ success: true })
            } else {
                cb({ success: false, message: 'error' })
            }
        })

        socket.on(eventKeys.SELLER_SET_CURRENT_PRODUCT_INDEX, (productIndex, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (streamId) {
                let strm = storages.streamSessions.get(streamId)
                strm['currentProductIndex'] = productIndex
                storages.streamSessions.set(streamId, strm)
                cb({ success: true })
                emitToStream(streamId, eventKeys.STREAM_UPDATE_CURRENT_PRODUCT_INDEX, productIndex)
            } else {
                cb({ success: false, message: 'error:  stream id is not valid' })
            }
        })

        socket.on(eventKeys.SELLER_GET_PUBLISH_TOKEN, (p, cb) => {
            console.log(p)
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    return socket.emit(eventKeys.STREAM_MESSAGE, toMessageObject('error', `the stream is not live OR invalid streamId for you, seller!`))
                }
                const tok = services.generateStreamToken(stream._id.toString(), true)
                console.log(cb)
                cb({ success: true, rtmpToken: tok })
            }).catch(error => {
                cb({ success: false, message: `error: internal server error: ${error}` })
            })
        })

        socket.on(eventKeys.SELLER_PUBLISH_PLAYER_STATUS, statusCode => {
            if (storeId) {
                console.log(`seller ${userId} / store ${storeId} / pusher status code ${statusCode}`)
            }
        })

        socket.on(eventKeys.USER_ADD_PRODUCT_TO_CART, async (payload, cb) => {
            const { productIndex, isReliable, variantIndex, quantity } = payload
            const streamId = services.getStreamIdByUserId(userId)
            if (streamId) {
                let strm = storages.streamSessions.get(streamId)
                if (strm.products[productIndex]) {
                    const productId = strm.products[productIndex].productId
                    let productDbObj = await ProductModel.findById(productId).catch(error => cb({ success: false, message: `internal server error: ${error}` }))
                    if (productDbObj && productDbObj.variants[variantIndex]) {
                        try {
                            let cart = await CartModel.findOne({ userId })
                            let { products } = cart
                            let foundIdx = -1

                            products.forEach((prod, idx) => {
                                if (prod.productId === productId){
                                    let isProdCartReliable = prod.reliablePrice > -1 ? true : false
                                    if (isReliable === isProdCartReliable) {
                                        foundIdx = idx
                                    }
                                }
                            })

                            if (foundIdx === -1) {
                                products.push({
                                    productId,
                                    storeId
                                })
                            } else {

                            }

                            /*
                            let variant = productDbObj.variants[variantIndex]
                            let _qty = variant.quantity
                            _qty - quantity >= 0 ? _qty -= quantity : cb({ success: false, message: `error: qty of request (${quantity}) is more than stock(${_qty})` })
                            productDbObj.variants[variantIndex].quantity = _qty
                            await productDbObj.save().catch(error => cb({ success: false, message: `internal server error: ${error}` }))
                            */
                        } catch (error) {
                            cb({ success: false, message: `interal server error: ${error}` })
                        }


                    } else {
                        cb({ success: false, message: `cannot find variant index in product ${productId}` })
                    }
                }
            } else {
                cb({ success: false, message: 'error: streamId is not valid for prod' })
            }
        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
            const streamId = services.getStreamIdByUserId(userId)
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
        const oldStreamId = services.getStreamIdByUserId(userId)
        oldStreamId && socket.leave(oldStreamId)
        services.setStreamWithUserId(userId, streamId)
        socket.join(streamId)
        //socket.emit(eventKeys.STREAM_MESSAGE, socket)
        emitToStream(streamId, eventKeys.STREAM_MESSAGE, toMessageObject('message', `${userId} joined the stream`))
    }
    catch (error) {
        console.log(error)
        emitToStream(streamId, eventKeys.SERVER_MESSAGE, toMessageObject('error', `error: ${error}`))
    }
}

const emitToStream = (streamId, eventKey, payload) => {
    if (io !== null) {
        io.to(streamId).emit(eventKey, payload)
        return true
    }
    return false
}

const toMessageObject = (type, message) => {
    return {
        type,
        message
    }
}

const toStreamStatusObject = (streamObject) => {
    let statusCode = 3
    let videoUri = ''
    let message = ''
    const { startTime, endTime } = streamObject
    if (endTime === Number.MAX_SAFE_INTEGER) {
        statusCode = 1
        videoUri = 'HLS Uri'
    }
    if (endTime > STREAM_ENDTIME_MINIMUM_TIMESTAMP && endTime < Number.MAX_SAFE_INTEGER) {
        statusCode = 2
        videoUri = 'VOD uri'
    }
    if (endTime === Number.MIN_SAFE_INTEGER && startTime !== 0) {
        statusCode = 0
        message = 'the stream is scheduled but not live yet'
    }
    return { statusCode, videoUri, message }
}

module.exports = {
    initIoServer,
    emitToStream,
}
