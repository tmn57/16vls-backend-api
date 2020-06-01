
//TODO: quantities of a variant of a product updated from product schema
const socketioJwt = require('socketio-jwt')
const { SOCKETIO_JWT_SECRET } = require('../config')

const StreamModel = require('../models/stream')

const eventKeys = require('./event_keys.io')
const storages = require('./storage')
const services = require('./services')

let io = null

const initIoServer = server => {
    io = require('socket.io')(server)

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
            if (storages.streamSessions.has(streamId)) {
                userJoinsStream(socket, streamId)
                socket.emit(eventKeys.STREAM_INIT, storages.streamSessions.get(streamId))
            } else {
                StreamModel.findById(streamId).then(stream => {
                    if (stream === null) {
                        socket.emit(eventKeys.STREAM_ERROR, 'streamId is invalid')
                    } else {
                        userJoinsStream(socket, streamId)
                        socket.emit(eventKeys.STREAM_INIT, stream.toObject())
                    }
                }).catch(error => {
                    socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
                })
            }
        })

        socket.on(eventKeys.SELLER_START_STREAM, () => {
            const strm = services.getStreamByStoreId(storeId)
            if (strm) {
                if (services.getStreamByUserId(userId) !== strm._id) {
                    return socket.emit(eventKeys.STREAM_ERROR, 'seller streaming flow is broken: you must use "join the stream" event before start the stream')
                }
                emitToStream(strm._id, eventKeys.STREAM_MESSAGE, `host is continuing the stream`)
                const tok = services.generateStreamToken(strm._id, true)
                socket.emit(eventKeys.STREAM_PUBLISH_TOKEN, tok)
            } else {
                //find the incoming stream of storeId
                StreamModel.findOne({ storeId, duration: 0 }).then(stream => {
                    if (stream === null) {
                        socket.emit(eventKeys.STREAM_ERROR, 'streamId is invalid for you, seller!')
                    } else {
                        if (services.getStreamByUserId(userId) !== stream._id) {
                            return socket.emit(STREAM_DIALOG_ERROR, 'seller streaming flow is broken: you must use "join the stream" event before start the stream')
                        }
                        //init the stream to memory storage
                        storages.streamSessions.set(stream._id, stream.toObject())
                        let productPayload = {}
                        socket.emit(eventKeys.STREAM_PRODUCTS_UPDATE, productPayload)
                    }
                }).catch(error => {
                    socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
                })
            }
        })

        socket.on(eventKeys.SELLER_END_STREAM, () => {
            const stream = services.getStreamByStoreId()
            if (stream) {
                StreamModel.updateOne({ ...stream }).then(updatedStream => {
                    socket.emit(eventKeys.STREAM_MESSAGE, 'seller have just ended the stream')
                    storages.streamSessions.delete(stream._id)
                }).catch(error => {
                    socket.emit(eventKeys.SERVER_MESSAGE, 'internal server error: ' + error.message)
                })
            } else {
                socket.emit(eventKeys.STREAM_ERROR, 'you have no stream currently live')
            }
        })

        socket.on(eventKeys.USER_ADD_MESSAGE, msg => {
            const streamId = services.getStreamByUserId(userId)
            if (streamId) {
                let stream = storages.streamSessions.get(streamId)
                
                let payload = { 
                    userId, 
                    inStreamAt: Date.now() - stream.startTime, 
                    message: msg
                }

                stream.messages.push(payload)
                storages.streamSessions.set(streamId, stream)

                emitToStream(streamId, eventKeys.STREAM_ADD_CHAT_MESSAGE, payload)
            } else {
                socket.emit(eventKeys.STREAM_ERROR, 'you have not joined any stream yet')
            }
        })

        socket.on(eventKeys.USER_ADD_PRODUCT_TO_CART, payload => {
            const { productId, variantIndex, quantity } = payload
        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
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

module.exports = {
    initIoServer,
    emitToStream,
}