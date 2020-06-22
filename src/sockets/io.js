
//TODO: quantities of a variant of a product updated from product schema
const socketioJwt = require('socketio-jwt')
const { SOCKETIO_JWT_SECRET, STREAM_ENDTIME_MINIMUM_TIMESTAMP } = require('../config')

const StreamModel = require('../models/stream')
const CartModel = require('../models/cart')
const ProductModel = require('../models/product')

const eventKeys = require('./event_keys.io')
const { streamSessions } = require('./services')
const services = require('./services')

let io = null

const initIoServer = server => {
    io = require('socket.io')(server, {
        pingInterval: process.env.SOCKETIO_CALLBACK_SECS * 1000,
        pingTimeout: process.env.SOCKETIO_CALLBACK_SECS * 500,
    })

    /** "One round trip" authorization **/
    io.use(socketioJwt.authorize({
        secret: SOCKETIO_JWT_SECRET,
        handshake: true,
        callback: process.env.SOCKETIO_CALLBACK_SECS * 1000
    }))

    io.on('connection', socket => {
        const userId = socket.decoded_token.userId
        const storeId = socket.decoded_token.storeId || null

        console.log(`user ${userId} connected`)
        socket.emit(eventKeys.SERVER_MESSAGE, toMessageObject('message', `hello ${userId}`))

        socket.on(eventKeys.USER_JOIN_STREAM, (streamId, cb) => {
            StreamModel.findById(streamId).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid' })
                } else {
                    console.log(`user ${userId} is joining stream ${streamId}`)
                    userJoinsStream(socket, streamId)
                    //Get productIds 
                    let prodIds = []
                    stream.products.forEach(prod => {
                        prodIds.push(prod.productId)
                    })

                    let streamObject = stream.toObject()

                    ProductModel.find({
                        '_id': { $in: prodIds }
                    }).then(rows => {
                        rows.forEach((r, idx) => {
                            const rObj = r.toObject()
                            streamObject['products'][idx] = { ...streamObject['products'][idx], ...rObj }
                        })
                        cb({ success: true, data: streamObject })
                        const streamStatusObj = toStreamStatusObject(streamObject)
                        socket.emit(eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    }).catch(error => {
                        console.log('get product db stream init error: ', error)
                        cb({ success: false, message: `error: internal server error: ${error}` })
                    })
                }
            }).catch(error => {
                cb({ success: false, message: `error: internal server error: ${error}` })
            })
        })

        socket.on(eventKeys.SELLER_START_STREAM, (p, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (!streamId) {
                cb({ success: false, message: 'error: you must join a stream first' })
                return;
            }
            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid for you, seller!' })
                } else {
                    if (streamId !== stream._id.toString()) {
                        cb({ success: false, message: 'error: seller streaming flow is broken: you must use "join the stream" event before start the stream' })
                    }
                    services.newStreamSession(stream)
                    stream.endTime = Number.MAX_SAFE_INTEGER
                    stream.save()
                    const streamStatusObj = toStreamStatusObject(stream)
                    emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    cb({ success: true })
                }
            }).catch(error => {
                cb({ success: false, message: `error: internal server error: ${error}` })
            })
        })

        socket.on(eventKeys.SELLER_END_STREAM, (p, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (!streamId) {
                cb({ success: false, message: 'error: you must join a stream first' })
                return;
            }

            //TODO:


            //find the stream of storeId
            StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
                if (stream === null) {
                    cb({ success: false, message: 'error: streamId is invalid for you, seller!' })
                } else {
                    if (streamId !== stream._id.toString()) {
                        cb({ success: false, message: 'error: seller streaming flow is broken: you must use "join the stream" event before start the stream' })
                    }
                    //Archive the stream
                    stream.messages = streamSessions.get(streamId).messages
                    stream.endTime = Date.now()
                    stream.save()
                    const streamStatusObj = toStreamStatusObject(stream)
                    emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                    cb({ success: true })
                }
            }).catch(error => {
                socket.emit(eventKeys.SERVER_MESSAGE, toMessageObject('error', `internal server error: ${error}`))
            })
        })

        socket.on(eventKeys.USER_ADD_MESSAGE, (msg, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (streamSessions.has(streamId)) {
                let stream = streamSessions.get(streamId)
                let payload = {
                    userId,
                    inStreamAt: Date.now(),
                    message: msg
                }
                stream.messages.push(payload)
                streamSessions.set(streamId, stream)
                emitToStream(streamId, eventKeys.STREAM_CHAT_MESSAGE, payload)
                cb({ success: true })
            } else {
                cb({ success: false, message: 'error: stream is not live or does not exist' })
            }
        })

        socket.on(eventKeys.SELLER_SET_CURRENT_PRODUCT_INDEX, (productIndex, cb) => {
            const streamId = services.getStreamIdByUserId(userId)
            if (streamSessions.has(streamId)) {
                let strm = streamSessions.get(streamId)
                if (strm.storeId === storeId) {
                    strm['currentProductIndex'] = productIndex
                    streamSessions.set(streamId, strm)
                    cb({ success: true })
                    emitToStream(streamId, eventKeys.STREAM_UPDATE_CURRENT_PRODUCT_INDEX, productIndex)
                } else {
                    cb({ success: false, message: 'error:  stream id is not your own' })
                }
            } else {
                cb({ success: false, message: 'error:  stream id is not valid' })
            }
        })

        socket.on(eventKeys.SELLER_GET_PUBLISH_TOKEN, (p, cb) => {
            // console.log(p)
            // StreamModel.findOne({ storeId, endTime: Number.MAX_SAFE_INTEGER }).then(stream => {
            //     if (stream === null) {
            //         cb({sucess: false, message:`the stream is not live OR invalid streamId for you, seller!`})
            //     }
            //     const tok = services.generateStreamToken(stream._id.toString(), true)
            //     console.log(cb)
            //     cb({ success: true, rtmpToken: tok })
            // }).catch(error => {
            //     cb({ success: false, message: `error: internal server error: ${error}` })
            // })
            cb({ success: true, rtmpToken: "osuighewiughweiug" })
        })

        socket.on(eventKeys.SELLER_PUBLISH_PLAYER_STATUS, statusCode => {
            if (storeId) {
                console.log(`seller ${userId} / store ${storeId} / pusher status code ${statusCode}`)
            }
        })

        socket.on(eventKeys.SELLER_UPDATE_STREAMPRICE, (payload, cb) => {
            const {productIndex, streamPrice} = payload
            const streamId = services.getStreamIdByUserId(userId)
            if (streamSessions.has(streamId)) {
                let strm = streamSessions.get(streamId)
                if (strm.storeId === storeId) {
                    strm['streamPrice'] = streamPrice
                    streamSessions.set(streamId, strm)
                    cb({ success: true })
                    emitToStream(streamId, eventKeys.STREAM_UPDATE_STREAMPRICE, {productIndex, streamPrice})
                } else {
                    cb({ success: false, message: 'error:  stream id is not your own' })
                }
            } else {
                cb({ success: false, message: 'error:  stream id is not valid' })
            }
        })

        socket.on(eventKeys.USER_ADD_PRODUCT_TO_CART, async (payload, cb) => {
            const { productIndex, isReliable, variantIndex, quantity } = payload
            const streamId = services.getStreamIdByUserId(userId)
            try {
                if (streamId) {
                    let strm = streamSessions.get(streamId)
                    console.log(eventKeys.USER_ADD_PRODUCT_TO_CART, strm)
                    if (strm.products[productIndex]) {
                        const productId = strm.products[productIndex].productId
                        let productDbObj = await ProductModel.findById(productId)
                        if (productDbObj && productDbObj.variants[variantIndex]) {
                            let cart = await CartModel.findOne({ userId })
                            if (cart == null) {
                                cb({success: false, message:'error: this problem may because of cart object in db of yours is null'})
                                return;
                            }
                            if (isReliable) {
                                let variant = productDbObj.variants[variantIndex]
                                let _qty = variant.quantity
                                if (_qty - quantity >= 0) {
                                    _qty -= quantity
                                } else {
                                    cb({ success: false, message: `error: qty of request (${quantity}) is more than stock(${_qty})` })
                                    return;
                                }
                                productDbObj.variants[variantIndex].quantity = _qty
                                cart.products.push({
                                    //TODO: make proper expired time
                                    expiredTime: Date.now() + 86400 * 1000,
                                    reliablePrice: strm.products[productIndex].streamPrice,
                                    productId,
                                    variantIndex,
                                    quantity
                                })
                                cart.save().then(() => {
                                    productDbObj.save().then(() => {
                                        emitToStream(streamId, eventKeys.STREAM_PRODUCT_QUANTITY, { productIndex, variantIndex, quantity: _qty })
                                        cb({ success: true })
                                    })
                                })
                            } else {
                                const { products } = cart

                                let foundIdx = -1
                                let foundQuantity = 0

                                products.forEach((cartProd, idx) => {
                                    if (cartProd.productId === productId) {
                                        let isProdCartReliable = cartProd.reliablePrice > -1 ? true : false
                                        if (!isProdCartReliable) {
                                            foundQuantity = cartProd.quantity
                                            foundIdx = idx
                                        }
                                    }
                                })

                                if (foundIdx === -1) {
                                    cart.products.push({
                                        productId,
                                        variantIndex,
                                        quantity
                                    })
                                } else {
                                    cart.products[foundIdx] = {
                                        productId,
                                        variantIndex,
                                        quantity: foundQuantity + quantity
                                    }
                                }
                                cart.save().then(() => cb({ success: true }))
                            }
                        } else {
                            cb({ success: false, message: `cannot find variant index in product ${productId}` })
                        }
                    }
                } else {
                    cb({ success: false, message: 'error: streamId is not valid for prod' })
                }
            } catch(error) {
                cb({ success: false, message: `internal server error: ${error}` })
            }
        })

        socket.on(eventKeys.USER_LIKE, (isUnlike, cb) => {
            let iUL = false
            isUnlike && (iUL = true)
            const isSuccess = updateLikedUsers(services.getStreamIdByUserId(userId), userId, iUL)
            if (isSuccess) {
                cb({ success: true })
                return;
            }
            cb({ success: false, message: 'cannot do like/unlike action' })
            return
        })

        socket.on('disconnect', reason => {
            console.log(`socketio: client disconnected with reason ${reason}`)
            const streamId = services.getStreamIdByUserId(userId)
            if (streamSessions.has(streamId)) {
                socket.leave(streamId)
                services.removeStreamWithUserId(userId)
                updateStreamViewCount(streamId, false)
            }
        })

    })
}

const userJoinsStream = (socket, streamId) => {
    try {
        const userId = socket.decoded_token.userId
        const oldStreamId = services.getStreamIdByUserId(userId)
        oldStreamId && socket.leave(oldStreamId)
        services.setStreamWithUserId(userId, streamId)
        socket.join(streamId)
        emitToStream(streamId, eventKeys.STREAM_MESSAGE, toMessageObject('message', `${userId} joined the stream`))
        updateStreamViewCount(streamId, true)
    }
    catch (error) {
        console.log(error)
        emitToStream(streamId, eventKeys.SERVER_MESSAGE, toMessageObject('error', `error: ${error}`))
    }
}

const emitToStream = (streamId, eventKey, payload) => {
    if (io !== null) {
        io.to(streamId).emit(eventKey, payload)
        return true
    }
    return false
}

const toMessageObject = (type, message) => {
    return {
        type,
        message
    }
}

const toStreamStatusObject = (streamObject) => {
    if (!process.env.RTMP_SERVER_IP) {
        console.log('env RTMP_SERVER_IP not found')
        return;
    }
    const rtmpIp = process.env.RTMP_SERVER_IP
    let statusCode = 3
    let videoUri = ''
    let message = ''
    const { startTime, endTime, _id: streamId } = streamObject
    if (endTime === Number.MAX_SAFE_INTEGER) {
        statusCode = 1
        videoUri = `http://${rtmpIp}/hls/${streamId.toString()}/index.m3u8`
    }
    if (endTime > STREAM_ENDTIME_MINIMUM_TIMESTAMP && endTime < Number.MAX_SAFE_INTEGER) {
        statusCode = 2
        videoUri = 'VOD uri'
    }
    if (endTime === Number.MIN_SAFE_INTEGER && startTime !== 0) {
        statusCode = 0
        message = 'the stream is scheduled but not live yet'
    }
    return { statusCode, videoUri, message }
}

const updateStreamViewCount = (streamId, isInc) => {
    if (streamSessions.has(streamId)) {
        let strm = streamSessions.get(streamId)
        isInc ? strm.currentViews++ : strm.currentViews--
        streamSessions.set(streamId, strm)
        emitToStream(streamId, eventKeys.STREAM_COUNT_VIEWS, strm.currentViews)
    }
}

const updateLikedUsers = (streamId, userId, isUnlike) => {
    if (streamSessions.has(streamId)) {
        let isChanged = false
        let strm = streamSessions.get(streamId)
        let { likedUsers } = strm
        if (isUnlike) {
            let idx = likedUsers.indexOf(userId)
            if (idx > -1) {
                likedUsers.splice(idx, 1)
                isChanged = true
            }
        } else {
            if (likedUsers.indexOf(userId) === -1) {
                likedUsers.push(userId)
                isChanged = true
            }
        }
        if (isChanged) {
            strm.likedUsers = likedUsers
            streamSessions.set(streamId, strm)
            emitToStream(streamId, eventKeys.STREAM_COUNT_LIKES, strm.likedUsers.length)
            return true
        }
        return false
    }
}

module.exports = {
    initIoServer,
    emitToStream,
}
