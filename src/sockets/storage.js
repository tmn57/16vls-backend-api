//userSessions <K,V>: K userId, V: {streamId}
let userSessions = new Map()

//streamSessions <K,V>: K: streamId, V: same schema in db
let streamSessions = new Map()

//streamTokens <K,V>: K: streamId (streamKey in nginx), V: {token,createdAt}
let streamTokens = new Map()

//productQuantities <K,V>: K: productId, V: [Number] - array of quantities with variant idx
let productQuantities = new Map()


module.exports = {
    userSessions,
    streamSessions,
    streamTokens,
    productQuantities
}