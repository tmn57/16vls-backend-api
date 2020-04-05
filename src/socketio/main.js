const socketioJwt = require('socketio-jwt')

module.exports = server => {
    
    const io = require('socket.io')(server)
    
    //jwt sign packet { userId: }

    io.use(socketioJwt.authorize({
        secret: process.env.SOCKETIO_JWT_SECRET,
        handshake: true,
        callback: SOCKETIO_CALLBACK_SECS * 1000
    }))

    io.on('connection', socket => {
        socket.emit('greeting-message', {message: 'hello'})
    })

} 