const storage = require('./storage')
const StreamModel = require('../models/stream')

const generateStreamToken = (streamKey, isHost) => {
    //TODO: generate a simple token
    const token = '123'
    storage.streamTokens.set(streamKey, { token, isHost, createdAt: Date.now() })
    return token
}

const isValidStreamToken = (streamKey, isHost, token) => {
    if (storage.streamTokens.has(streamKey)) {
        let result = false
        const timeout = (process.env.RTMP_AUTH_TIMEOUT_SECS || 300) * 1000

        const obj = storage.streamTokens.get(streamKey)
        const tok = obj['token']
        const ih = obj['isHost']
        const ca = obj['ca']

        if (tok === token && ih === isHost && ((Date.now() - ca) < timeout)) {
            result = true
        }

        storage.streamTokens.delete(streamKey)
        return result
    }
    return false
}

const getStreamInfoList = () => {
    let result = []
    storage.streamSessions.forEach((v, k) => {
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

const getStreamByStoreId = storeId => {
    storage.streamSessions.forEach(ss => {
        if (ss.storeId === storeId) {
            return ss
        }
    })
    return null
}

const getStreamByUserId = userId => {
    if (storage.userSessions.has(userId)) {
        return storage.userSessions.get(userId).streamId || null
    }
    return null
}

const setStreamWithUserId = (userId, streamId) => {
    if (storage.userSessions.has(userId)) {
        let uss = storage.userSessions.get(userId)
        uss['streamId'] = streamId
        storage.userSessions.set(userId, uss)
    } else {
        storage.userSessions.set(userId, { streamId })
    }
}

const removeStreamWithUserId = userId => {
    if (storage.userSessions.has(userId)) {
        let uss = storage.userSessions.get(userId)
        uss['streamId'] = null
        storage.userSessions.set(userId, uss)
    }
}

module.exports = {
    generateStreamToken,
    isValidStreamToken,
    getStreamInfoList,
    getStreamByStoreId,
    getUsersInfo,
    getStreamByUserId,
    setStreamWithUserId,
    removeStreamWithUserId
}

