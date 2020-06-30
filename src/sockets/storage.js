//userSessions <K,V>: K userId, V: {streamId}
var userSessions = new Map()

//streamSessions <K,V>: K: streamId, V: {videoStreamStatusHistory, messages, currentProductIndex: 0, products:[{productId, streamPrice}]}
var streamSessions = new Map()
//status levels: 0 (wait for starting), 1: start, 2: pause, 3:resume, 4:end

//streamTokens <K,V>: K: streamId (streamKey in nginx), V: {token,createdAt}
var streamTokens = new Map()

//
var productSessions = new Map()

//userTokens <K,V>: K: token, V: {userId, name, phone, avatarUri, expiredAt}
var userTokens = new Map()

module.exports = {
    userSessions,
    streamSessions,
    streamTokens,
    productSessions,
    userTokens
}