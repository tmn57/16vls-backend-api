const NOF_BEFORE_SECS = 90
var messageQueue = []
var multicastMessageQueue = []
var streamTasks = new Map()
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')

const addToStreamTasks = (streamId, startTime, msgObject, storeId) => {
    streamTasks.set(streamId, {
        startTime,
        msgObject,
        storeId
    })
    console.log('addToStreamTask called: added to streamTasks')
}

const updateInStreamTasks = (streamId, startTime) => {
    const st = streamTasks.get(streamId)
    st.startTime = startTime
    streamTasks.set(streamId, st)
    console.log('updateToStreamTask called: updated to streamTasks')
}

const removeFromStreamTasks = (streamId) => {
    if (streamTasks.has(streamId)) {
        streamTasks.delete(streamId)
    }
    console.log('removeFromStreamTasks called: removed from streamTasks')

}

const updateMulticastMessageQueue = () => {
    streamTasks.forEach(async (v, k) => {
        let { startTime, msgObject, storeId } = v
        console.log(`updateMessageQueue called: startTime:`, startTime, typeof (startTime), ` get time in: ${Math.abs(Date.now() - startTime)} secs`)
        if (Math.abs(Date.now() - startTime) < NOF_BEFORE_SECS * 1000) {
            console.log(`updateMessageQueue: storeId ${storeId}`)
            let users = await UserModel.find({ storeFollowed: storeId })
            console.log(`updateMessageQueue: got ${users.length} users:`)
            const dvtoks = []
            const newNotifications = []
            const { title, body } = msgObject.notification
            users.forEach(user => {
                if (typeof (user.firebaseDeviceToken) !== 'undefined' && user.firebaseDeviceToken !== '') {
                    dvtoks.push(user.firebaseDeviceToken)
                    newNotifications.push(new NotificationModel({
                        userId: user._id.toString(),
                        title,
                        body,
                        status: 1,
                        data: JSON.stringify({ target: 'watching', params: { streamId: k } }),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    }))
                }
            })
            console.log(`updateMessageQueue: updated for ${dvtoks.length} with ${newNotifications.length} new notifications: `)
            if (dvtoks.length) {
                const fcmMsg = {
                    messageObject: msgObject,
                    tokens: dvtoks
                }
                multicastMessageQueue.push(fcmMsg)
                NotificationModel.collection.insertMany(newNotifications, (err, docs) => {
                    console.log(`inserted ${docs.insertedCount} notifications ${err && `got errors: ${err}`}`)
                })
            }
            console.log(`added to MessageQueue.`)
            streamTasks.delete(k)
        }
    })
}

module.exports = {
    messageQueue,
    multicastMessageQueue,
    updateInStreamTasks,
    addToStreamTasks,
    updateMulticastMessageQueue,
    removeFromStreamTasks
}
