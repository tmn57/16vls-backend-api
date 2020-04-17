const socketioJwt = require('socketio-jwt')

module.exports = server => {
    
    const io = require('socket.io')(server)
    
    //jwt sign packet { userId: }

    /** "One round trip" authorization **/
    io.use(socketioJwt.authorize({
        secret: process.env.SOCKETIO_JWT_SECRET,
        handshake: true,
        callback: SOCKETIO_CALLBACK_SECS * 1000
    }))

    io.on('connection', socket => {
        
        let userId = socket.decoded_token.userId

        socket.emit('greeting message', {message: `hello ${userId}`})
        
        // rid: String 'r#[RoomID]' 
        socket.on('join room', roomId => {
            // TODO: check if roomId is not valid

            // TODO: IMPORTANT! Check if (user is already in one room) => exit that room

            //Tell others in the roomId that user joined the room
            socket.to(roomId).emit(`user #${userId} joined the room`)

            //Send the whole room data then if have ACK (the data )
            socket.emit('room data', {data: 'the whole room data'}, ()=>{
                socket.emit('room update products', {data: [{productId: 1234, variants: [{color:'red', size:'32', price: 1000000, stream_price: 800000, qty: 100}]}]})
            })

        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
        })

    })

} 