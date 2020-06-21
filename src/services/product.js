const socketStorage = require('../sockets/storage')
const { emitToStream } = require('../sockets/io')
const realTimeEventKeys = require('../sockets/event_keys.io')
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

//For APIs: This function is triggered AFTER SUCCESSFUL product's variant's quantity update!!!
/*input: productId: _id of product
        variantIndex: index of variant quantity change in 'variants' array
        newQuantity: newQuantity of this variant after update
        inStreams: 'inStreams' field of product object
*/
const onChangeQuantityProductVariant = (productId, variantIndex, newQuantity, inStreams) => {
    if (Array.isArray(inStreams) && inStreams.length) {
        const streamId = inStreams[inStreams.length - 1]
        if (socketStorage.streamSessions.has(streamId)) {
            emitToStream(streamId, realTimeEventKeys.STREAM_PRODUCT_QUANTITY, {productId, variantIndex, newQuantity})
        }
    }
}

module.exports = {
    checkProductLiveStream,
    onChangeQuantityProductVariant
}