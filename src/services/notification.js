const fb = require('../utils/firebase')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')

/**
 * @param {*} title: String: title of Notification
 * @param {*} body: String: description (content) of Notification
 * @param {*} userId: String: id of user 
 * @param {*} time: Number: timestamp (milliseconds) of time to send notification OR -1 if want to send immediately
 * @param {*} metadata (optional): object return from toMetadataObject
 */
const sendToSingle = async (title, body, userId, time, metadata) => {
    const user = await UserModel.findById(userId)
    if (user && user.firebaseDeviceToken && user.firebaseDeviceToken !== "") {
        const { firebaseDeviceToken } = user
        const now = Date.now()
        const notificationObject = fb.toMessageObject(title, body, metadata ? metadata : null)

        let newNotification = new NotificationModel({
            userId,
            title,
            body,
        })
        metadata && (newNotification.data = metadata)
        newNotification = await newNotification.save()

        if (time === -1 || time >= now) {
            const isSent = await fb.sendSingle(firebaseDeviceToken, notificationObject)
            if (isSent) {
                newNotification.status = 1
                await newNotification.save()
            }
        }
        setTimeout(() => {
            fb.sendSingle(firebaseDeviceToken, notificationObject)
            const isSent = await fb.sendSingle(firebaseDeviceToken, notificationObject)
            if (isSent) {
                newNotification.status = 1
                await newNotification.save()
            }
        }, now - time)
    } else {
        console.log(`send nof to single fail: user ${userId} or firebase token not found`)
    }
}

/**
 * @param {*} title: String: title of Notification
 * @param {*} body: String: description (content) of Notification
 * @param {*} notificationObject : Object: get from function toNotificationObject 
 * @param {*} userIds: Array: array of String from function toNotificationObject
 * @param {*} time: Number: timestamp (milliseconds) of time to send notification OR -1 if want to send immediately
 * @param {*} metadata (optional): object return from toMetadataObject
 */
const sendToMany = async (title, body, userIds, time, metadata) => {
    if (!Array.isArray(userIds)) return
    if (userIds.length = 1) return sendToSingle(title, body, userIds[0], time, metadata)

    const users = await UserModel.find({ userId: { $in: userIds } })
    const notificationObject = fb.toMessageObject(title, body, metadata ? metadata : null)

    let fbDeviceTokens = []
    let newNotifications = []
    users.forEach(u => {
        if (u.firebaseDeviceToken && u.firebaseDeviceToken !== "") {
            fbDeviceTokens.push(u.firebaseDeviceToken)
            let newNotification = new NotificationModel({
                userId: u._id.toString(),
                title,
                body,
                status: 1
            })
            metadata && (newNotification.data = metadata)
            newNotifications.push(newNotification)
        }
    })

    if (fbDeviceTokens.length) {
        await NotificationModel.collection.insertMany(newNotifications)

        const now = Date.now()
        if (time === -1 || time >= now) {
            fb.sendMulticast(fbDeviceTokens, notificationObject)
        }
        setTimeout(() => {
            fb.sendMulticast(fbDeviceTokens, notificationObject)
        }, now - time)
    }
}

module.exports = {
    sendToSingle,
    sendToMany,
}