const express = require('express')
const asyncHandler = require('express-async-handler')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const { raiseError } = require('../utils/common')
const NotificationService = require('../services/notification')
const router = express.Router()
const { isAuthenticated } = require('../middlewares/auth')

router.post('/device-token', isAuthenticated,  asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { token } = req.body
    const user = await UserModel.findById(userId)
    if (user) {
        user.firebaseDeviceToken = token
        await user.save()
        res.status(200).json({
            success: true,
            data: token
        })
    } else {
        next(raiseError(400, `user ${userId} not found`))
    }
}))

router.post('/list', isAuthenticated, asyncHandler(async (req, res) => {
    const { limit } = req.body
    const { userId } = req.tokenPayload
    const notifs = await NotificationModel.find({ userId }, { limit: limit || 20 })
    res.status(200).json({
        success: true,
        data: notifs
    })
}))

router.post('/seen', isAuthenticated, asyncHandler(async (req, res, next) => {
    const { notificationId } = req.body
    const { userId } = req.tokenPayload
    const notif = await NotificationModel.findOne({ _id: notificationId, userId })
    if (notif) {
        notif.status = 2
        await notif.save()
        res.status(200).json({
            success: true,
            data: notif
        })
    } else {
        next(raiseError(400, `not found notification`))
    }
}))

router.get('/test', asyncHandler(async(req,res)=>{
    const users = await UserModel.find()
    let uids = []
    users.forEach(u=> {uids.push(u._id.toString())})
    console.log(`sending test token for ${dtks}`)

    NotificationService.sendToMany('this is test', 'welcome to 16vls app', uids, -1)
    res.send(200).send('sent')
}))

module.exports = router