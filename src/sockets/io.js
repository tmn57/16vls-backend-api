const socketioJwt = require('socketio-jwt')

const memory = require('./memory_models')

module.exports = server => {
    const io = require('socket.io')(server)

    /** "One round trip" authorization **/
    // io.use(socketioJwt.authorize({
    //     secret: process.env.SOCKETIO_JWT_SECRET,
    //     handshake: true,
    //     callback: SOCKETIO_CALLBACK_SECS * 1000
    // }))

    io.on('connection', socket => {
        // let userId = socket.decoded_token.userId
        let userId = 1

        socket.emit('greeting message', {message: `hello ${userId}`})
        
        // rid: String 'r#[StreamID]' 
        socket.on('join Stream', streamId => {
            // TODO: check if StreamId is not valid

            // TODO: IMPORTANT! Check if (user is already in one Stream) => exit that Stream

            //Tell others in the StreamId that user joined the Stream
            io.to(streamId).emit(`user #${userId} joined the Stream`)

            const streamData = memory.getStreamData(streamId)

            //Send the whole Stream data then if have ACK (the data )
            socket.emit('stream data', streamData, ()=>{
                socket.emit('stream update products', {data: [{productId: 1234, variants: [{color:'red', size:'32', price: 1000000, stream_price: 800000, qty: 100}]}]})
            })

        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
        })

    })

} 