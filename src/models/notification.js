const { Schema, model } = require('mongoose')

const NotificationSchema = new Schema({
    userId: String,
    title: String,
    body: String,
    data: Object,
    status: {type: Number, default: 0}, //0: isNotSent, 1: isSent, 2: isSeen
}, {
    timestamps: true,
})

module.exports = model('Notification', NotificationSchema)