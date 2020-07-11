const { uuid } = require('uuidv4');
const StoreModel = require('../models/store')
const { userSessions, streamSessions, streamTokens, productSessions, userTokens } = require('./storage')
const { StreamVideoStatus } = require('./constants')
const { STREAM_ENDTIME_MINIMUM_TIMESTAMP } = require('../config');

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
    console.log('newStreamSession: added stream to mem: ' + _id.toString())
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
    if (Array.isArray(productIds)) {
        productIds.forEach(id => {
            productSessions.set(id, streamId)
        })
        console.log(`addToProductSessions: Added products `, productIds.length, ` with ${streamId}`)
        return true
    }
    console.log(`addToProductSessions: FAILED caused of not-array-productIds with ${streamId}`)
    return false
}

const removeFromProductSessions = productIds => {
    if (Array.isArray(productIds)) {
        productIds.forEach(id => {
            productSessions.delete(id)
        })
        console.log(`removeFromProductSessions: Removed ${productIds.length} products to products sessions`)
        return true
    }
    console.log(`removeFromProductSessions: FAILED caused of not-array-productIds`)
    return false
}

const getValidLiveStream = (userId, cb, storeId) => {
    const streamId = getStreamIdByUserId(userId)
    const callback = (typeof (cb) === 'function') ? cb : console.log
    if (!streamId) {
        callback({ success: false, message: `Không tìm thấy stream cho bạn`, errorCode: 2 })
        return null
    }
    let strm = streamSessions.get(streamId)
    if (!strm) {
        console.log(`getValidLiveStream error: stream ${streamId} not found in streamSessions (live)`)
        callback({ success: false, message: `StreamID ${streamId} không tồn tại trên trình quản lý phiên stream`, errorCode: 2 })
        return null
    }
    if (storeId) {
        if (strm.storeId === storeId) return strm
        return null
    }
    return strm
}

const toStreamStatusObject = (streamObject) => {
    if (!process.env.RTMP_SERVER_IP) {
        return console.log('env RTMP_SERVER_IP not found')
    }
    const videoServerAddr = process.env.RTMP_SERVER_IP
    let statusCode = 0
    let videoUri = ''
    let message = ''

    if (typeof streamObject['streamId'] === 'undefined') {
        const { endTime, startTime, recordedFileName, _id } = streamObject
        const streamId = _id.toString()
        //if stream db obj
        if (endTime === Number.MIN_SAFE_INTEGER && startTime !== 0) {
            statusCode = 0
            message = 'the stream is scheduled but not live yet'
        }
        if (endTime === Number.MAX_SAFE_INTEGER) {
            statusCode = 1
            videoUri = `http://${videoServerAddr}/hls/${streamId.toString()}/index.m3u8`
        }
        if (endTime > STREAM_ENDTIME_MINIMUM_TIMESTAMP && endTime < Number.MAX_SAFE_INTEGER) {
            statusCode = 4;
            if (recordedFileName !== '') {
                statusCode = 5;
                videoUri = `http://${videoServerAddr}/vod/${recordedFileName}`;
            }
        }
        return { statusCode, videoUri, message }
    } else {
        //if stream session obj
        const { streamId, videoStreamStatusHistory: vsh } = streamObject
        if (vsh.length === 1) {
            return { statusCode: 1, videoUri, message }
        }
        if (vsh.length === 2) {
            return { statusCode: 2, videoUri: `http://${videoServerAddr}/hls/${streamId.toString()}/index.m3u8`, message }
        }
        const lastStatusCode = vsh[vsh.length - 1].statusCode
        if (lastStatusCode === StreamVideoStatus.START) {
            return { statusCode: 2, videoUri: `http://${videoServerAddr}/hls/${streamId.toString()}/index.m3u8`, message }
        }
        if (lastStatusCode === StreamVideoStatus.INTERRUPT) {
            return { statusCode: 3, videoUri, message: 'Stream từ người bán đang bị gián đoạn' }
        }
        if (lastStatusCode === StreamVideoStatus.END) {
            return { statusCode: 4, videoUri, message: 'Stream từ người bán đã kết thúc' }
        }
    }
}


//User RealTime Token Manager
//{userId, name, phone, avatar, expiredAt}
const signRealtimeToken = async userDbObject => {
    const { _id, name, phone, avatar } = userDbObject;
    const userId = _id.toString();
    const store = await StoreModel.findOne({ userId })
    let storeId = null
    if (store) {
        storeId = store._id.toString();
    }
    let newToken = uuid().split('-').join('')
    //set to map
    userTokens.set(newToken, {
        userId,
        userName: name ? name : phone,
        userPhone: phone,
        userAvatar: avatar,
        storeId,
        expiredTime: Date.now() + 1000000 //1000secs 
    })
    cleanupUserTokens()
    return newToken
}

const cleanupUserTokens = () => {
    userTokens.forEach((v, k) => {
        if (v.expiredTime < Date.now()) {
            userTokens.delete(k)
        }
    })
}

const checkValidRealtimeToken = token => {
    const userPayload = userTokens.get(token)
    if (userPayload && (userPayload.expiredTime >= Date.now())) {
        userPayload.expiredTime = Date.now() + 1000000 //1000secs
        return userPayload
    }
    return null
}

//END: user realtime token manager
module.exports = {
    streamSessions,
    userSessions,
    streamTokens,
    productSessions,
    generateStreamToken,
    isValidStreamToken,
    getStreamInfoList,
    getStreamIdByUserId,
    setStreamWithUserId,
    removeStreamWithUserId,
    newStreamSession,
    addStreamVideoStatusHistory,
    addToProductSessions,
    removeFromProductSessions,
    getValidLiveStream,
    toStreamStatusObject,
    checkValidRealtimeToken,
    signRealtimeToken,
}

