/**
 * Event naming convention:
 * +if event from client: Verb + Noun
 * +if event from server: Noun + Verb
 * +if event from server is error or warning: start the msg with
 */
module.exports = {
    SERVER_MESSAGE:'server message',
    STREAM_ADD_CHAT_MESSAGE: 'stream add chat message',
    STREAM_INIT: 'stream init',
    STREAM_PRODUCTS_UPDATE: 'stream update products',
    USER_JOIN_STREAM: 'user join stream',
    USER_ADD_MESSAGE: 'user add chat message',

}