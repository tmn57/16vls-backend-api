const socketStorage = require('../sockets/storage')
const stream = require('../models/stream')
//input: product db object
//output: streamId if have stream is live for product / return "" if none
const checkProductLiveStream = productDbObject => {
    const { inStreams } = productDbObject
    if (Array.isArray(inStreams) && inStreams.length) {
        const streamId = inStreams[inStreams.length - 1]
        if (socketStorage.streamSessions.has(streamId)) return streamId
    } 
    return ""
}

module.exports = {
    checkProductLiveStream
}