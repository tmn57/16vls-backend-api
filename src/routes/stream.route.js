const express = require('express')
const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const { SOCKETIO_JWT_SECRET } = require('../config')
const { StreamVideoStatus } = require('../sockets/constants')
const streamHandler = require('../sockets/services')
const router = express.Router()
const { isAuthenticated, storeOwnerRequired } = require('../middlewares/auth')
const StreamModel = require('../models/stream')
const StoreModel = require('../models/store')
const { raiseError } = require('../utils/common')
const { streamSessions } = require('../sockets/services')

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

router.post('/rtmp-pub-auth', (req, res) => {
    console.log(
        `rtmp-pub-auth request from ${req.connection.remoteAddress} / got env ip ${process.env.RTMP_SERVER_IP}`,
        `rtmp auth request with token ${sk} for stream ${st}`
    )

    if (!process.env.RTMP_SERVER_IP) {
        return res.status(500).json({ message: 'rtmp server ip does not found in env config' })
    }

    const reqIp = req.connection.remoteAddress

    if (reqIp === '::ffff:' + process.env.RTMP_SERVER_IP) {
        const streamKey = req.query.sk || ''
        const token = req.query.st || ''

        return res.sendStatus(200)

        if (streamKey !== '' && token !== '') {
            if (streamHandler.isValidStreamToken(streamKey, true, token)) {
                return res.sendStatus(200)
            }
        }
    }
    return res.sendStatus(400)
})

router.post('/create', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res) => {
    const { startTime, title, products } = req.body

    let prodsDbObj = []

    console.log("body payload", req.body)

    products.forEach(product => {
        const { productId, streamPrice } = product
        prodsDbObj.push({ productId, streamPrice })
    })

    let nStream = new StreamModel({
        startTime,
        title,
        storeId: req.storeId,
        products: prodsDbObj
    })

    addedStream = await nStream.save()

    res.status(200).json({
        success: true,
        newStream: addedStream
    })
}))

router.post('/update', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res, next) => {
    const { streamId, startTime, title, products } = req.body

    console.log("body payload", req.body)

    let stream = await StreamModel.findOne({ _id: streamId, storeId: req.storeId })

    if (stream) {
        if (stream.endTime === Number.MIN_SAFE_INTEGER) {
            let prodsDbObj = []

            products.forEach(product => {
                const { productId, streamPrice } = product
                prodsDbObj.push({ productId, streamPrice })
            })

            stream.startTime = startTime
            stream.title = title
            stream.products = prodsDbObj

        } else {
            next.raiseError(400, `update information for started stream is not allowed`)
        }
    } else {
        next(raiseError(400, `cannot find stream with id ${streamId} and store id ${req.storeId}`))
    }
}))

router.get('/rttk', isAuthenticated, asyncHandler(async (req, res) => {
    const { userId } = req.tokenPayload
    let rtPayload = { userId }

    store = await StoreModel.findOne({ userId })

    if (store !== null) {
        rtPayload["storeId"] = store._id.toString()
    }

    const tok = jwt.sign(rtPayload, SOCKETIO_JWT_SECRET, { expiresIn: '6h' })

    console.log(rtPayload, tok)

    res.status(200).json({
        success: true,
        token: tok
    })
}))

router.post('/list', asyncHandler(async (req, res) => {
    //TODO: check req.body for checking type of stream ('live', 'incoming', 'archived')
    let list = await StreamModel.find({})

    res.status(200).json({
        success: true,
        data: list
    })
}))

//request structure: /rtmp-check-allow-join?sk=streamId
router.post('/rtmp-check-allow-join', async (req, res) => {
    if (!process.env.RTMP_SERVER_IP) {
        return res.status(500).json({ message: 'rtmp server ip does not found in env config' })
    }

    const reqIp = req.connection.remoteAddress

    //if (reqIp === process.env.RTMP_SERVER_IP) {
    if (true) {
        const streamKey = req.query.sk || ''
        if (streamKey !== '') {
            if (streamSessions.has(streamKey)) {
                const strm = streamSessions.get(streamKey)
                const lastVideoStreamStatusCode = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].statusCode
                if (lastVideoStreamStatusCode === StreamVideoStatus.END) {
                    return res.sendStatus(200)
                }
            }
            const stream = await StreamModel.findById(streamKey).catch(error => console.log(`check allow join rtmp error in db: ${error}`))
            if (stream) {
                if (stream.endTime > 0 && stream.endTime < Number.MAX_SAFE_INTEGER) {
                    return res.sendStatus(200)
                }
            }
        }
    }
    return res.sendStatus(400)
})

//request structure: /rtmp-record-join-done?fn=streamId_timestamp.ext_media_file
router.post('/rtmp-record-join-done', async (req, res) => {
    const filename = req.query.fn || ''
    if (filename === '') {
        return res.sendStatus(400)
    }
    const streamId = filename.split('_')[0]
    console.log(`record of stream ${streamId} done with name ${filename}`)
    try {
        let stream = await StreamModel.findById(streamId)
        if (stream) {
            stream.recordedFileName = fn
            await stream.save()
            return res.sendStatus(200)
        }
    } catch (error) {
        console.log(`internal server error on get rtmp-record-join-done ${error}`)
        return res.status(500).send(`internal server error on get rtmp-record-join-done ${error}`)
    }
    //recordedFileName

    return res.status(400).send(`invalid request`)
})

module.exports = router