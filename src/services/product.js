const { streamSessions, productSessions } = require('../sockets/services')
const { emitToStream } = require('../sockets/io')
const realTimeEventKeys = require('../sockets/event_keys.io')
//input: product db object
//output: {streamId, streamPrice} if have stream is live for product / return null if none
const checkProductLiveStream = productDbObject => {
    const { _id } = productDbObject
    const productId = _id.toString()
    const streamId = productSessions.get(productId)
    const strm = streamSessions.get(streamId)
    if (strm) {
        const { products } = strm
        for (let i = 0; i < products.length; i++) {
            if (products[i].productId === productId) {
                const { streamPrice } = products[i]
                return { streamId, streamPrice }
            }
        }
    }
    return null
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
        if (streamSessions.has(streamId)) {
            emitToStream(streamId, realTimeEventKeys.STREAM_PRODUCT_QUANTITY, { productId, variantIndex, newQuantity })
        }
    }
}

module.exports = {
    checkProductLiveStream,
    onChangeQuantityProductVariant
}