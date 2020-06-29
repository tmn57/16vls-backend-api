const { userSessions, streamSessions, streamTokens, productSessions } = require('./storage')
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
    let productIds = []
    products.forEach(prod => {
        const { productId, inStreamAts, streamPrice } = prod
        productSS.push({
            productId,
            inStreamAts,
            streamPrice
        })
        productIds.push(productId)
    })
    const newStreamSS = {
        streamId: _id.toString(),
        videoStreamStatusHistory: [{ statusCode: StreamVideoStatus.WAIT, time: Date.now() }],
        //currentViews: 0,
        messages: [],
        currentProductIndex: 0,
        likedUsers: [],
        storeId,
        products: productSS,
        participants: []
        
    }
    streamSessions.set(_id.toString(), newStreamSS)
    addToProductSessions(productIds, _id.toString())
    console.log('added stream to mem: ', streamSessions.get(_id.toString()))
    return newStreamSS
}

const addStreamVideoStatusHistory = (streamId, statusCode) => {
    let strm = streamSessions.get(streamId)
    if (strm) {
        strm.videoStreamStatusHistory.push({ statusCode, time: Date.now() })
        streamSessions.set(streamId, strm)
    }
}

const addToProductSessions = (productIds, streamId) => {
    console.log(`productSessions: Adding products `, productIds, ` with ${streamId} to prosduct sessions`)
    if (Array.isArray(productIds)) {
        productIds.forEach(id => {
            productSessions.set(id, streamId)
        })
        return true
    }
    return false
}

const removeFromProductSessions = productIds => {
    console.log(`productSessions: Removing products ${productIds} to products sessions`)
    if (Array.isArray(productIds)) {
        productIds.forEach(id => {
            productSessions.delete(id)
        })
        return true
    }
    return false
}

const getValidLiveStream = (userId, cb, storeId) => {
    const streamId = getStreamIdByUserId(userId)
    const callback = (typeof (cb) === 'function') ? cb : console.log
    if (!streamId) {
        callback({ success: false, message: `error: not found stream of you` })
        return null
    }
    let strm = streamSessions.get(streamId)
    if (!strm) {
        console.log(`error: stream ${streamId} not found in streamSessions (live)`)
        callback({ success: false, message: `error: stream ${streamId} not found in streamSessions (live)` })
        return null
    }
    if (storeId && (strm.storeId !== storeId)) {
        callback({ success: false, message: `error: you are trying to action stream of shopId ${strm.storeId}` })
        return null
    }
    return strm
}

const toStreamStatusObject = (streamObject) => {
    if (!process.env.RTMP_SERVER_IP) {
        return console.log('env RTMP_SERVER_IP not found')
    }
    const rtmpIp = process.env.RTMP_SERVER_IP
    let statusCode = 3
    let videoUri = ''
    let message = ''
    const { startTime, endTime, _id: streamId, recordedFileName } = streamObject
    if (endTime === Number.MAX_SAFE_INTEGER) {
        statusCode = 1
        videoUri = `http://${rtmpIp}/hls/${streamId.toString()}/index.m3u8`
    }
    if (endTime > STREAM_ENDTIME_MINIMUM_TIMESTAMP && endTime < Number.MAX_SAFE_INTEGER) {
        statusCode = 2
        if (recordedFileName !== '') {
            videoUri = `http://${rtmpIp}/vod/${recordedFileName}`
        }
    }
    if (endTime === Number.MIN_SAFE_INTEGER && startTime !== 0) {
        statusCode = 0
        message = 'the stream is scheduled but not live yet'
    }
    return { statusCode, videoUri, message }
}

module.exports = {
    streamSessions,
    userSessions,
    streamTokens,
    productSessions,
    generateStreamToken,
    isValidStreamToken,
    getStreamInfoList,
    getUsersInfo,
    getStreamIdByUserId,
    setStreamWithUserId,
    removeStreamWithUserId,
    newStreamSession,
    addStreamVideoStatusHistory,
    addToProductSessions,
    removeFromProductSessions,
    getValidLiveStream,
    toStreamStatusObject,
}

