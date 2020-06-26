const { Schema, model } = require('mongoose')

const NotificationSchema = new Schema({
    userId: String,
    title: String,
    body: String,
    data: Object,
    status: Number, //0: isNotSent, 1: isSent, 2: isSeen
})

module.exports = model('Notification', NotificationSchema)