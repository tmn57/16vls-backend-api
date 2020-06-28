const NOF_BEFORE_SECS = 90
var messageQueue = []
var streamTasks = new Map()
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')

const addToStreamTasks = (streamId, startTime, msgObject) => {
    streamTasks.set(streamId, {
        startTime,
        msgObject
    })
}

const updateInStreamTasks = (streamId, startTime) => {
    const st = streamTasks.get(streamId)
    st.startTime = startTime
    streamTasks.set(streamId, st)
}

const removeFromStreamTasks = (streamId) => {
    if (streamTasks.has(streamId))
        streamTasks.delete(streamId)
}

const updateMessageQueue = () => {
    streamTasks.forEach(async (k, v) => {
        if (Math.abs(Date.now() - v.startTime) < NOF_BEFORE_SECS * 1000) {
            let users = await UserModel.find({ storeFollowed: { $elemMatch: k } })
            const dvtoks = []
            const newNotifications = []
            const { title, body } = v.msgObject
            users.forEach(user => {
                if (typeof (user.firebaseDeviceToken) !== 'undefined' && user.firebaseDeviceToken !== '') {
                    dvtoks.push(user.firebaseDeviceToken)
                    newNotifications.push(new NotificationModel({
                        userId: user._id.toString(),
                        title,
                        body,
                        status: 1
                    }))
                }
            })
            if (dvtoks.length) {
                v.msgObject['tokens'] = dvtoks
                messageQueue.push(v.msgObject)
                NotificationModel.collection.insertMany(newNotifications, (err, docs) => {
                    console.log(`stream task: insert many notifications ${err && `with error ${err}`}`, docs)
                })
            }
            streamTasks.delete(streamId)
        }
    })
}

module.exports = {
    messageQueue,
    updateInStreamTasks,
    addToStreamTasks,
    updateMessageQueue,
    removeFromStreamTasks
}
