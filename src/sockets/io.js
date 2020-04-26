
const socketioJwt = require('socketio-jwt')
const services = require('../services/stream')

const eventKeys = require('./event_keys.io')
const storage = require('./storage')
const handler = require('./handlers')

module.exports = server => {
    const io = require('socket.io')(server)

    /** "One round trip" authorization **/
    // io.use(socketioJwt.authorize({
    //     secret: process.env.SOCKETIO_JWT_SECRET,
    //     handshake: true,
    //     callback: SOCKETIO_CALLBACK_SECS * 1000
    // }))

    io.on('connection', socket => {
        //Add or update key userId userSession from db
        
        // let userId = socket.decoded_token.userId
        let userId = 'uidtest'

        socket.emit(eventKeys.SERVER_MESSAGE, { message: `hello ${userId}` })

        // rid: String 'r#[StreamID]' 
        socket.on(eventKeys.USER_JOIN_STREAM, streamId => {
            if (storage.streamSessions.has(streamId)) {
                io.to(streamId).emit(eventKeys.SERVER_MESSAGE, `${userId} is watching the stream`)
                const streamInfo = handler.getStreamInfo(streamId)
                socket.emit(eventKeys.STREAM_INIT, streamInfo, () => {
                    socket.emit(eventKeys., )
                })
            } else {
                socket.emit('error',`stream ID is not valid or not available or not living`)
            }
        })

        socket.on('disconnect', reason => {
            if (storage)
            console.log(`socketio: client disconnected with reason ${reason}`)
        })

    })

} 