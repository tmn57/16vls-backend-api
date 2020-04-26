const storage = require('./storage')

const getStreamInfo = streamId => {
    if(storage.streamSessions.has(streamId)){
        return storage.streamSessions.get(streamId)
    }
    return null
}

const getUsersInfo = userIds =>{
    if (userIds.length) {
        let ret = []
        userIds.forEach(element => {
            
        })
    } else {
        console.warn('getUsersInfo error: the userIds must not be an empty array')
       return {}
    }
}

module.exports = {
    getStreamInfo
}

