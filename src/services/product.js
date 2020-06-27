const { streamSessions } = require('../sockets/services')
const { emitToStream } = require('../sockets/io')
const realTimeEventKeys = require('../sockets/event_keys.io')
//input: product db object
//output: {streamId, streamPrice} if have stream is live for product / return null if none
const checkProductLiveStream = productDbObject => {
    const { _id, inStreams } = productDbObject
    if (Array.isArray(inStreams) && inStreams.length) {
        const productId = _id.toString()
        const streamId = inStreams[inStreams.length - 1]
        if (streamSessions.has(streamId)) {
            const strm = streamSessions.get(streamId)
            for (let i = 0; i < strm.products.length; i++) {
                const prod = strm.products[i]
                if (prod.productId === _id.toString()) {
                    const { streamPrice } = prod
                    return { streamId, streamPrice, productIndex: i }
                }
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