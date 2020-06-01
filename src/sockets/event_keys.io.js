/**
 * 3 subjects: server, stream (individual stream), user
 * Event naming convention:
 * +if event from client: Verb + Noun
 * +if event from server: Noun + Verb
 * +if event from server is error or warning: start the msg with
 */
module.exports = {
    //JSON payload
    STREAM_INIT: 'stream init',
    STREAM_PRODUCTS_UPDATE: 'stream updates products',
    STREAM_ADD_CHAT_MESSAGE: 'stream adds chat message',
    USER_ADD_PRODUCT_TO_CART: 'user adds product',
    //String payload
    SERVER_MESSAGE: 'server message',
    STREAM_MESSAGE: 'stream message',
    STREAM_ERROR: 'stream error',
    USER_JOIN_STREAM: 'user joins stream',
    USER_ADD_MESSAGE: 'user adds chat message',
    SELLER_START_STREAM: 'seller starts stream',
    SELLER_END_STREAM: 'seller ends stream',
    STREAM_PUBLISH_TOKEN: 'stream publish token',
}