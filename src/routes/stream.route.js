const express = require('express')
const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const { SOCKETIO_JWT_SECRET } = require('../config')
const streamHandler = require('../sockets/services')
const router = express.Router()
const { isAuthenticated, storeOwnerRequired } = require('../middlewares/auth')
const StreamModel = require('../models/stream')
const StoreModel = require('../models/store')

//Stream Server publish authentication
//Required queries: sk = stream key; st = stream token; sr = role (default:play)
// router.post('/rtmp-auth', (req, res) => {
//     const trustedId = process.env.RTMP_SERVER_IP || 'http://13.229.229.219/'
//     const reqIp = req.connection.remoteAddress
//     if (reqIp !== trustedId) {
//         res.status(400).send("intrusted rtmp srv")
//     } else {
//         const streamKey = req.query.sk || ''
//         const token = req.query.st || ''
//         const role = req.query.sr || ''
//         if (streamKey !== '' && token !== '' && role !== '') {
//             const isPublish = role === 'publish'
//             if (streamHandler.isValidStreamToken(streamKey, isPublish, token)) {
//                 res.status(200)
//             } else {
//                 res.status(401).send('unauthorized')
//             }
//         } else {
//             res.status(400).send('not enough query field(s)')
//         }
//     }
// })

router.post('rtmp-pub-auth', (req, res) => {
    if (!process.env.RTMP_SERVER_IP) {
        return res.status(500).json({ message: 'rtmp server ip does not found in env config' })
    }

    const reqIp = req.connection.remoteAddress

    if (reqIp === process.env.RTMP_SERVER_IP) {
        const streamKey = req.query.sk || ''
        const token =  req.query.sr || ''
        if (streamKey !== '' && token !== '') {
            if (streamHandler.isValidStreamToken(streamKey, true, token)) {
                res.sendStatus(200)
            } else {
                res.sendStatus(401)
            }
        }
    } else {
        res.sendStatus(400)
    }

})

router.post('/create', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res) => {
    const { startTime, title, products } = req.body
    //TODO: validating data

    let nStream = new StreamModel({
        startTime,
        title,
        storeId: req.storeId,
        products
    })

    addedStream = await nStream.save()

    res.status(200).json({
        success: true,
        newStream: addedStream
    })
}))

router.get('/rttk', isAuthenticated, asyncHandler(async (req, res) => {
    const { userId } = req.tokenPayload
    let rtPayload = { userId }

    store = await StoreModel.findOne({ ownerId: userId })
    
    if (store !== null) {
        rtPayload["storeId"] = store._id
    }

    const tok = jwt.sign(rtPayload, SOCKETIO_JWT_SECRET, { expiresIn: '6h' })

    console.log(rtPayload, tok)

    res.status(200).json({
        success:true,
        token: tok
    })
}))

router.post('/list', asyncHandler(async (req, res) => {
    //TODO: check req.body for checking type of stream ('live', 'incoming', 'archived')

    let list = await StreamModel.find()

    res.status(200).json({
        success: true,
        data: list
    })
}))

module.exports = router