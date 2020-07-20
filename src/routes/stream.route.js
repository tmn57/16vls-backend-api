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
const { checkProductLiveStream } = require('../services/product')
const { raiseError } = require('../utils/common')
const { streamSessions, getStreamIdByUserId, getValidLiveStream, toStreamStatusObject, signRealtimeToken } = require('../sockets/services')
const workerServices = require('../workers/services')
const fb = require('../utils/firebase')
const { BrandedCallList } = require('twilio/lib/rest/preview/trusted_comms/brandedCall')


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
    const { startTime, title, products, videoCapture } = req.body

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
        products: prodsDbObj,
        videoCapture
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
    const { streamId, startTime, title, products, videoCapture } = req.body
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
            stream.videoCapture = videoCapture
            stream.markModified('startTime')
            stream.markModified('title')
            stream.markModified('products')
            stream.markModified('videoCapture')
            await stream.save()

            //START updateIncomingStreamNotification()
            workerServices.updateInStreamTasks(streamId, startTime)
            //END

            return res.status(200).json({
                success: true,
                stream: stream.toObject()
            })

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
    let limit = (req.body.moreLevel || 1) * 10;
    let count = 0;
    let statusCode = -1;
    if (typeof req.body['statusCode'] !== 'undefined') {
        if (req.body.statusCode > -1 && req.body.statusCode < 6) {
            statusCode = req.body.statusCode
        }
    }
    res.status(200).json({
        success: true,
        data: await getStreamList(limit, statusCode, false)
    })
}))

router.post('/sellerList', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res, next) => {
    const { storeId } = req;
    let limit = (req.body.moreLevel || 1) * 10;
    let statusCode = -1;
    if (typeof req.body['statusCode'] !== 'undefined') {
        if (req.body.statusCode > -1 && req.body.statusCode < 6) {
            statusCode = req.body.statusCode
        }
    }

    res.status(200).json({
        success: true,
        data: await getStreamList(limit, statusCode, storeId)
    })
}))

router.post('/getByIds', isAuthenticated, asyncHandler(async (req, res, next) => {
    const { streamIds } = req.body
    if (!Array.isArray(streamIds)) return next(raiseError(400, 'array is required'))
    const streams = await StreamModel.find({ _id: { $in: streamIds } })
    const streamObjects = []
    streams.forEach(s => streamObjects.push(s.toObject()))
    return res.status(200).json({
        success: true,
        streams: streamObjects
    })
}))

router.post('/rtmp-pub-auth', (req, res) => {
    return res.sendStatus(200)
    console.log(`rtmp-pub-auth request from ${req.connection.remoteAddress} / got env ip ${process.env.RTMP_SERVER_IP}`)
    if (!process.env.RTMP_SERVER_IP) {
        return res.status(500).json({ message: 'rtmp server ip does not found in env config' })
    }
    const reqIp = req.connection.remoteAddress
    if (reqIp === '::ffff:' + process.env.RTMP_SERVER_IP) {
        const streamKey = req.query.sk || ''
        const token = req.query.st || ''
        console.log(`rtmp auth request with token ${streamKey} for stream ${token}`)
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

const getStreamList = async (limit, statusCode, storeId) => {
    let liveStreams = [];
    let incomingStreams = [];
    let doneStreams = [];

    const allowLive = (statusCode === 1) || (statusCode === - 1)
    const allowIncoming = (statusCode === 0) || (statusCode === - 1)
    const allowDone = (statusCode === 5) || (statusCode === - 1)

    let cond = {};
    if (storeId) cond = { storeId };
    const streams = await StreamModel.find(cond).sort({ updatedAt: -1 });

    streams.map(s => {
        if (s.endTime === Number.MAX_SAFE_INTEGER) {
            allowLive && liveStreams.push(s);
            return;
        }
        if (s.endTime === Number.MIN_SAFE_INTEGER) {
            allowIncoming && incomingStreams.push(s);
            return;
        }
        allowDone && doneStreams.push(s);
    })

    let streamList = [...liveStreams, ...incomingStreams, ...doneStreams].slice(0, limit);
    //streamList = [];

    // await Promise.all(streamList.map(async (stream, idx) => {
    //     streamList[idx] = await convertStreamToStreamObjectWithMeta(stream)
    // }))

    for (let i = 0; i < streamList.length; i++) {
       streamList[i] = await convertStreamToStreamObjectWithMeta(streamList[i]); 
    }

    //console.log(streamList);

    return streamList;
}

const convertStreamToStreamObjectWithMeta = async (stream) => {
    const streamStatusObj = toStreamStatusObject(stream)
    
    let prodIds = []
    
    stream.products.forEach(prod => {
        prodIds.push(prod.productId)
    })
    
    let streamObject = stream.toObject()
    const store = await StoreModel.findById(streamObject.storeId)
    const prods = await ProductModel.find({ '_id': { $in: prodIds } })

    streamObject.shopName = store ? store.name : 'Không tồn tại'

    let products = []

    for (let i = 0; i < prods.length; i++) {
        const liveRObj = checkProductLiveStream(prods[i])
        let productObj = {}
        if (liveRObj) {
            productObj = { ...prods[i].toObject(), ...liveRObj }
        } else {
            productObj = prods[i].toObject()
        }
        products[i] = {...streamObject.products[i], ...productObj}
    }

    let { products: streamProducts } = streamObject;

    // console.log(`streamProcucts lengt`, streamProducts.length)

    for (let i = 0; i < streamProducts.length; i++) {
        console.log(`hit`)
        for (let j = 0; j < products.length; j++) {
            // console.log(`products [${j}]._id `, products[j]._id, ' ', typeof(products[j]._id));
            // console.log(`streamProducts[${i}].productId: `, streamProducts[j].productId, ' ', typeof(streamProducts[j].productId));
            if (streamProducts[i].productId === products[j]._id.toString()) {
                // console.log(`=== ? ${streamProducts[i].productId === products[j]._id}`)
                streamProducts[i] = products[j]
                break;
            }
        }
    }

    streamObject.products = streamProducts;

    if (streamStatusObj.message) {
        delete streamStatusObj['message']
    }

    return {
        ...streamObject,
        ...streamStatusObj
    }
}

module.exports = router
