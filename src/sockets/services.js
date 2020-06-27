const { userSessions, streamSessions, streamTokens } = require('./storage')
const { StreamVideoStatus } = require('./constants')

var count = 0 
const generateStreamToken = (streamKey, isHost) => {
    //TODO: generate a simple token
    const token = '123' + count++
    streamTokens.set(streamKey, { token, isHost, createdAt: Date.now() })
    return token
}

const isValidStreamToken = (streamKey, isHost, token) => {
    if (streamTokens.has(streamKey)) {
        let result = false
        const timeout = (process.env.RTMP_AUTH_TIMEOUT_SECS || 300) * 1000

        const obj = streamTokens.get(streamKey)
        const tok = obj['token']
        const ih = obj['isHost']
        const ca = obj['ca']

        if (tok === token && ih === isHost && ((Date.now() - ca) < timeout)) {
            result = true
        }

        streamTokens.delete(streamKey)
        return result
    }
    return false
}

const getStreamInfoList = () => {
    let result = []
    streamSessions.forEach((v, k) => {
        tmp = { ...v }
        tmp["streamId"] = k
        tmp["numOfParticipants"] = tmp.participants.length
        delete tmp["participants"]
        result.push(tmp)
    })
    return result
}

const getUsersInfo = async userIds => {
    if (userIds.length) {
        //get infos from db
        // await userModels.find({'_id':{$in:userIds}}).then(users=>{

        // }).catch(error => {
        //     console.log('get info of users error',error)
        //     return {}
        // })
        return [{ userId: 'useridtest' }, { userId: 'hostuidtest' }]

    } else {
        console.warn('getUsersInfo error: the userIds must not be an empty array')
        return []
    }
}

const getStreamIdByUserId = userId => {
    if (userSessions.has(userId)) {
        return userSessions.get(userId).streamId || null
    }
    return null
}

const setStreamWithUserId = (userId, streamId) => {
    if (userSessions.has(userId)) {
        let uss = userSessions.get(userId)
        uss['streamId'] = streamId
        userSessions.set(userId, uss)
    } else {
        userSessions.set(userId, { streamId })
    }
}

const removeStreamWithUserId = userId => {
    if (userSessions.has(userId)) {
        let uss = userSessions.get(userId)
        uss['streamId'] = null
        userSessions.set(userId, uss)
    }
}

const newStreamSession = streamDbObj => {
    const { _id, storeId, products } = streamDbObj
    let productSS = []
    products.forEach(prod => {
        const { productId, inStreamAts, streamPrice } = prod
        productSS.push({
            productId,
            inStreamAts,
            streamPrice
        })
    })
    streamSessions.set(_id.toString(), {
        streamId: _id.toString(),
        videoStreamStatusHistory: [{ statusCode: StreamVideoStatus.WAIT, time: Date.now() }],
        //currentViews: 0,
        messages: [],
        currentProductIndex: 0,
        likedUsers: [],
        storeId,
        products: productSS,
        participants: []
    })
    console.log('added stream to mem: ', streamSessions.get(_id.toString()))
}

const addStreamVideoStatusHistory = (streamId, statusCode) => {
    let strm = streamSessions.get(streamId)
    if (strm) {
        strm.videoStreamStatusHistory.push({statusCode, time:Date.now()})
    }
}

module.exports = {
    streamSessions,
    userSessions,
    streamTokens,
    generateStreamToken,
    isValidStreamToken,
    getStreamInfoList,
    getUsersInfo,
    getStreamIdByUserId,
    setStreamWithUserId,
    removeStreamWithUserId,
    newStreamSession,
    addStreamVideoStatusHistory
}

