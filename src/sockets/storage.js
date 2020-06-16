//userSessions <K,V>: K userId, V: {streamId}
let userSessions = new Map()

//streamSessions <K,V>: K: streamId, V: {messages, currentProductIndex: 0, products:[{variantQuantities[],streamPrice}]}
let streamSessions = new Map()

//streamTokens <K,V>: K: streamId (streamKey in nginx), V: {token,createdAt}
let streamTokens = new Map()

module.exports = {
    userSessions,
    streamSessions,
    streamTokens,
}