const express = require('express')
const asyncHandler = require('express-async-handler')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const { raiseError } = require('../utils/common')
const NotificationService = require('../services/notification')
const router = express.Router()
const { isAuthenticated } = require('../middlewares/auth')

router.post('/device-token', isAuthenticated, asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { token } = req.body
    const user = await UserModel.findById(userId)
    if (user && token) {
        user.firebaseDeviceToken = (token === 'del' ? '' : token)
        user.markModified('firebaseDeviceToken')
        await user.save()
        res.status(200).json({
            success: true,
            data: token
        })
    } else {
        next(raiseError(400, `Không tìm thấy tài khoản ${userId}`))
    }
}))

router.post('/list', isAuthenticated, asyncHandler(async (req, res) => {
    const { limit } = req.body
    const { userId } = req.tokenPayload
    const notifs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit || 32)
    const result = []
    notifs.forEach(notif => {
        result.push(notif.toObject())
    })
    res.status(200).json({
        success: true,
        data: result
    })
}))

router.post('/seen', isAuthenticated, asyncHandler(async (req, res, next) => {
    const { notificationIds } = req.body
    const { userId } = req.tokenPayload

    if (!Array.isArray(notificationIds)) {
        return next(raiseError(400, `array of notification ids is required`))
    }

    await NotificationModel.updateMany({ _id: { $in: notificationIds } }, { $set: { status: 2, updatedAt: Date.now() } }, (err, writeResult) => {
        //console.log(`user ${userId} set 'seen' notifications ${writeResult}`)
        res.status(200).json({
            success: true,
            data: writeResult
        })
    });
}))

router.get('/checkNewCount', isAuthenticated, asyncHandler(async (req, res) => {
    const { userId } = req.tokenPayload
    const notifs = await NotificationModel.find({ userId, status: 1 })
    res.status(200).json({
        success: true,
        count: notifs.length
    })
}))

router.get('/test', asyncHandler(async (req, res) => {
    const users = await UserModel.find()
    let uids = []
    users.forEach(u => { uids.push(u._id.toString()) })
    await NotificationService.sendToMany('Thông điệp thử nghiệm của 16VLS', 'Đây là thông điệp thử nghiệm lúc: ' + Date.now().toString(), uids, -1)
    res.status(200).send('sent')
}))


router.post('/dashboard-send-notification-to-single', asyncHandler(async (req, res, next) => {

    //TODO: only allow dashboard server ip

    const { title, body, userId, itime, metadata } = req.body
    if (!title || !body || !userId) {
        return next(raiseError(400, `not enough field being provided`))
    }
    await NotificationService.sendToSingle(title, body, userId, itime, metadata);
    res.sendStatus(200)
}))

module.exports = router