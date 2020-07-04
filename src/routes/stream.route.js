const express = require('express')
const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const dayjs = require('dayjs')
const { StreamVideoStatus } = require('../sockets/constants')
const streamHandler = require('../sockets/services')
const { isAuthenticated, storeOwnerRequired } = require('../middlewares/auth')
const StreamModel = require('../models/stream')
const StoreModel = require('../models/store')
const UserModel = require('../models/user')
const ProductModel = require('../models/product')
const {checkProductLiveStream} = require('../services/product')
const { raiseError } = require('../utils/common')
const { streamSessions, getStreamIdByUserId, getValidLiveStream, toStreamStatusObject, signRealtimeToken } = require('../sockets/services')
const workerServices = require('../workers/services')
const fb = require('../utils/firebase')
const stream = require('../models/stream')


const router = express.Router()

router.get('/sellerCheck', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res) => {
    const { userId } = req.tokenPayload
    const { storeId } = req
    const strm = getValidLiveStream(userId, 'naf', storeId)
    if (strm) {
        return res.status(200).json({
            success: true,
            streamId: strm.streamId,
            isLive: false
        })
    }
    const dbStream = await StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER })
    if (dbStream) {
        return res.status(200).json({
            success: true,
            streamId: dbStream._id.toString(),
            isLive: false
        })
    }
    res.status(200).json({
        success: true,
        streamId: null,
        isLive: false
    })
}))

router.post('/delete', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res) => {
    const { streamId } = req.body
    const { storeId } = req
    const delStream = await StreamModel.findOneAndDelete({ _id: streamId, storeId, endTime: Number.MIN_SAFE_INTEGER })
    if (delStream) {
        workerServices.removeFromStreamTasks(delStream._id.toString())
        return res.status(200).json({
            success: true
        })
    }
    res.status(400).json({
        success: false,
        message: `Chỉ được xóa bởi chủ store và stream đó chưa live `
    })
}))

router.post('/create', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res, next) => {
    const { startTime, title, products } = req.body

    const liveStream = await StreamModel.findOne({ storeId: req.storeId, endTime: { $in: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER] } })

    if (liveStream) {
        return next(raiseError(400, `Bạn đang chưa hoàn thành stream ${(liveStream)._id.toString()}`))
    }

    let prodsDbObj = []

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

    //START createIncomingStreamNotification()
    const store = await StoreModel.findById(req.storeId)
    const { name: storeName } = store
    const { _id } = addedStream
    const nofMsgObj = fb.toMessageObject(`Livestream của ${storeName} sắp diễn ra!`, `${title} lúc ${dayjs(startTime).locale('vi-vn').format('HH:mm:ss')}`, { target: 'watching', params: { streamId: _id.toString() } })
    workerServices.addToStreamTasks(_id.toString(), startTime, nofMsgObj, req.storeId)
    //END

    res.status(200).json({
        success: true,
        newStream: addedStream
    })
}))

router.post('/details', asyncHandler((async (req, res, next) => {
    const { streamId } = req.body
    const stream = await StreamModel.findById(streamId)
    if (stream) {
        return res.status(200).json({
            success: true,
            stream: stream.toObject()
        })
    }
    next(raiseError(400, "Không tìm thấy theo stream ID"))
})))

router.post('/update', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res, next) => {
    const { streamId, startTime, title, products } = req.body
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
            stream.markModified('startTime')
            stream.markModified('title')
            stream.markModified('products')
            await stream.save()

            //START updateIncomingStreamNotification()
            workerServices.updateInStreamTasks(streamId, startTime)
            //END

        } else {
            next.raiseError(400, `update information for started stream is not allowed`)
        }
    } else {
        next(raiseError(400, `cannot find stream with id ${streamId} and store id ${req.storeId}`))
    }
}))

router.get('/rttk', isAuthenticated, asyncHandler(async (req, res) => {
    const { userId } = req.tokenPayload
    const user = await UserModel.findById(userId)
    if (user) {
        const tok = await signRealtimeToken(user)
        return res.status(200).json({
            success: true,
            token: tok
        })
    }
    next(raiseError(500, 'Đã có lỗi xảy ra trong quá trình lấy rttk'))
}))

router.post('/list', isAuthenticated, asyncHandler(async (req, res, next) => {
    let statusCode = -1
    if (typeof req.body['statusCode'] !== 'undefined') {
        if (req.body.statusCode > -1 && req.body.statusCode < 6) {
            statusCode = req.body.statusCode
        }
    }

    let streams = await StreamModel.find({}).sort({ updateAt:-1, endTime: -1})

    let list = []

    await Promise.all(streams.map(async stream => {
        const streamStatusObj = toStreamStatusObject(stream)
        //Get productIds
        let prodIds = []
        stream.products.forEach(prod => {
            prodIds.push(prod.productId)
        })
        let streamObject = stream.toObject()
        const store = await StoreModel.findById(streamObject.storeId)
        const prods = await ProductModel.find({ '_id': { $in: prodIds } })
        streamObject['shopName'] = store ? store.name : 'Không tồn tại'
        prods.forEach((r, idx) => {
            const liveRObj = checkProductLiveStream(r)
            let rObj
            if (liveRObj){
                rObj = {...r.toObject(),...liveRObj}
            } else {
                rObj = r.toObject()
            }
            streamObject['products'][idx] = { ...streamObject['products'][idx], ...rObj }
        })
        if ((streamStatusObj.statusCode === statusCode) || statusCode === -1) {
            if (typeof streamStatusObj['message'] !== 'undefined') delete streamStatusObj['message']
            let l = {
                ...streamObject,
                ...streamStatusObj
            }
            list.push(l)
        }
    }))

    res.status(200).json({
        success: true,
        data: list
    })
}))

router.post('/sellerList', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res, next) => {
    const { storeId } = req
    let statusCode = -1
    if (typeof req.body['statusCode'] !== 'undefined') {
        if (req.body.statusCode > -1 && req.body.statusCode < 6) {
            statusCode = req.body.statusCode
        }
    }
    
    let streams = await StreamModel.find({ storeId, endTime:{$nin:[Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER]}}).sort({ updateAt:-1, endTime: -1})
    let priorStream = await StoreModel.findOne({storeId, endTime:{$nin:[Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER]}})
    if (priorStream) streams.unshift(priorStream)

    let list = []

    await Promise.all(streams.map(async stream => {
        const streamStatusObj = toStreamStatusObject(stream)
        //Get productIds
        let prodIds = []
        stream.products.forEach(prod => {
            prodIds.push(prod.productId)
        })
        let streamObject = stream.toObject()
        const store = await StoreModel.findById(streamObject.storeId)
        const prods = await ProductModel.find({ '_id': { $in: prodIds } })
        streamObject['shopName'] = store ? store.name : 'Không tồn tại'
        prods.forEach((r, idx) => {
            const liveRObj = checkProductLiveStream(r)
            let rObj
            if (liveRObj){
                rObj = {...r.toObject(),...liveRObj}
            } else {
                rObj = r.toObject()
            }
            streamObject['products'][idx] = { ...streamObject['products'][idx], ...rObj }
        })
        if ((streamStatusObj.statusCode === statusCode) || statusCode === -1) {
            if (typeof streamStatusObj['message'] !== 'undefined') delete streamStatusObj['message']
            let l = {
                ...streamObject,
                ...streamStatusObj
            }
            list.push(l)
        }
    }))

    res.status(200).json({
        success: true,
        data: list
    })
}))

router.post('/rtmp-pub-auth', (req, res) => {
    console.log(`rtmp-pub-auth request from ${req.connection.remoteAddress} / got env ip ${process.env.RTMP_SERVER_IP}`)

    if (!process.env.RTMP_SERVER_IP) {
        return res.status(500).json({ message: 'rtmp server ip does not found in env config' })
    }

    const reqIp = req.connection.remoteAddress

    if (reqIp === '::ffff:' + process.env.RTMP_SERVER_IP) {
        const streamKey = req.query.sk || ''
        const token = req.query.st || ''

        console.log(`rtmp auth request with token ${streamKey} for stream ${token}`)

        return res.sendStatus(200)

        if (streamKey !== '' && token !== '') {
            if (streamHandler.isValidStreamToken(streamKey, true, token)) {
                return res.sendStatus(200)
            }
        }
    }
    return res.sendStatus(400)
})

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
            stream.recordedFileName = filename
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
