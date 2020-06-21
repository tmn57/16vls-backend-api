//userSessions <K,V>: K userId, V: {streamId}
var userSessions = new Map()

//streamSessions <K,V>: K: streamId, V: {messages, currentProductIndex: 0, products:[{productId, streamPrice}]}
var streamSessions = new Map()

//streamTokens <K,V>: K: streamId (streamKey in nginx), V: {token,createdAt}
var streamTokens = new Map()

module.exports = {
    userSessions,
    streamSessions,
    streamTokens,
}