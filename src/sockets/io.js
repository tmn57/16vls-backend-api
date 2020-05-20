
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
        const storeId = socket.decoded_token.storeId || 'none'

        console.log(`user ${userId} connected`)

        socket.emit(eventKeys.SERVER_MESSAGE, 'hello' + userId + '!')

        socket.on(eventKeys.USER_JOIN_STREAM, streamId => {
            StreamModel.findById(streamId).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_ERROR, 'streamId is invalid')
                } else {
                    userJoinsStream(socket, streamId)
                    socket.emit(eventKeys.STREAM_INIT, stream.toObject())
                    console.log(`user ${userId}: stream init db ${streamId}`)
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
            })
        })

        socket.on(eventKeys.SELLER_START_STREAM, () => {
            const streamId = services.getStreamByUserId(userId)
            if (!streamId) {
                return socket.emit(eventKeys.STREAM_ERROR, 'you must join a stream first')
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_ERROR, 'streamId is invalid for you, seller!')
                } else {
                    if (streamId !== stream._id.toString()) {
                        return socket.emit(STREAM_ERROR, 'seller streaming flow is broken: you must use "join the stream" event before start the stream')
                    }
                    services.newStreamSession(streamId)
                    stream.endTime = Number.MAX_SAFE_INTEGER
                    stream.save()
                    emitToStream(streamId, eventKeys.SELLER_START_STREAM, "")
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
            })
        })

        socket.on(eventKeys.SELLER_END_STREAM, () => {
            const streamId = services.getStreamByUserId(userId)
            if (!streamId) {
                return socket.emit(eventKeys.STREAM_ERROR, 'you must join a stream first')
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    socket.emit(eventKeys.STREAM_ERROR, 'streamId is invalid for you, seller!')
                } else {
                    if (streamId !== stream._id.toString()) {
                        return socket.emit(eventKeys.STREAM_ERROR, 'seller streaming flow is broken: you must use "join the stream" event before start the stream')
                    }
                    //Archive the stream
                    stream.messages = storage.streamSessions.get(streamId).messages
                    stream.endTime = Date.now()
                    stream.save()
                    emitToStream(streamId, eventKeys.SELLER_END_STREAM, "")
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
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
                socket.emit(eventKeys.STREAM_ERROR, 'you have not joined any stream yet')
            }
        })

        //socket.on(eventKeys)

        socket.on(eventKeys.USER_ADD_PRODUCT_TO_CART, payload => {
            const { productId, variantIndex, quantity, isSureBuying } = payload
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
    const userId = socket.decoded_token.userId
    const oldStreamId = services.getStreamByUserId(userId)
    oldStreamId && socket.leave(oldStreamId)
    services.setStreamWithUserId(userId, streamId)
    socket.join(streamId)
    emitToStream(streamId, eventKeys.STREAM_MESSAGE, `${userId} joined the stream`)
}

const emitToStream = (streamId, eventKeys, payload) => {
    if (io !== null && storages.streamSessions.has(streamId)) {
        io.to(streamId).emit(eventKeys, payload)
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

module.exports = {
    initIoServer,
    emitToStream,
}