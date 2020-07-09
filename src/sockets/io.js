
//TODO: quantities of a variant of a product updated from product schema
const { StreamVideoStatus } = require('./constants')
const { STREAM_INTERRUPT_TIMEOUT_SECS } = require('../config')

const StreamModel = require('../models/stream')
const ProductModel = require('../models/product')

const eventKeys = require('./event_keys.io')
const { streamSessions, addStreamVideoStatusHistory, getValidLiveStream, toStreamStatusObject } = require('./services')
const socketServices = require('./services')
const { addProductToCart } = require('../services/cart')

let io = null

const initIoServer = server => {
    io = require('socket.io')(server, {
        pingInterval: process.env.SOCKETIO_CALLBACK_SECS * 1000,
        pingTimeout: process.env.SOCKETIO_CALLBACK_SECS * 1000,
    })

    //new auth middleware
    io.use((socket, next) => {
        let token = socket.handshake.query.token;
        const realtimeUserPayload = socketServices.checkValidRealtimeToken(token)
        if (realtimeUserPayload) {
            socket.user_payload = realtimeUserPayload
            return next();
        }
        return next();
    });

    io.on('connection', socket => {
        const { userId, userAvatar, storeId, userName, userPhone } = socket.user_payload
        console.log(`Socket: user ${userId} connected`)
        const oldStreamId = socketServices.getStreamIdByUserId(userId)
        oldStreamId && socket.leave(oldStreamId)
        socket.emit(eventKeys.SERVER_MESSAGE, toMessageObject('message', `Xin chào ${userName}!`))
        socket.on(eventKeys.USER_JOIN_STREAM, (streamId, cb) => {
            try {
                StreamModel.findById(streamId).then(stream => {
                    if (stream === null) {
                        cb({ success: false, message: 'StreamID không hợp lệ', errorCode: 2 })
                    } else {
                        console.log(`Socket: user ${userId} is joining stream ${streamId}`)
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
                            const strm = getValidLiveStream(userId, cb)
                            let streamStatusObj = null
                            if (strm) {
                                streamStatusObj = toStreamStatusObject(strm)
                            } else {
                                streamStatusObj = toStreamStatusObject(streamObject)
                            }
                            streamStatusObj && socket.emit(eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                        })
                    }
                })
            } catch (error) {
                console.log(`Socket USER_JOIN_STREAM: db error: `, error)
                cb({ success: false, message: `Đã có lỗi xảy ra trong hệ thống: ${error}`, errorCode: 2 })
            }
        })

        socket.on(eventKeys.SELLER_START_STREAM, (p, cb) => {
            const streamId = socketServices.getStreamIdByUserId(userId)
            if (!streamId) {
                return cb({ success: false, message: 'Bạn phải tham gia vào một phiên stream trước', errorCode: 2 })
            }
            console.log(`Socket: seller ${userId} with store ${storeId} is start stream ${streamId}`)
            //find the stream of storeId
            try {
                StreamModel.findOne({ storeId, endTime: Number.MIN_SAFE_INTEGER }).then(async stream => {
                    if (stream === null) {
                        return cb({ success: false, message: 'Bạn không phải là chủ phiên stream này', errorCode: 2 })
                    } else {
                        if (streamId !== stream._id.toString()) {
                            console.log(`SELLER_START_STREAM error: seller ${userId} want to start stream ${streamId} but got ${stream._id.toString()}`)
                            return cb({ success: false, message: 'Lỗi khi triển khai stream, bạn cần thoát màn hình stream và quay lại', errorCode: 2 })
                        }
                        stream.endTime = Number.MAX_SAFE_INTEGER
                        stream.markModified('endTime')
                        stream.save()
                        //add stream to streamSessions
                        socketServices.newStreamSession(stream)
                        const streamStatusObj = toStreamStatusObject(stream)
                        emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)
                        cb({ success: true })
                    }
                })
            } catch (error) {
                cb({ success: false, message: `Đã có lỗi xảy ra trong hệ thống: ${error}`, errorCode: 2 })
            }
        })

        socket.on(eventKeys.SELLER_END_STREAM, (p, cb) => {
            const strm = getValidLiveStream(userId, cb, storeId)
            if (strm) {
                endStreamHandler(strm.streamId, cb)
            }
        })

        socket.on(eventKeys.USER_ADD_MESSAGE, (msg, cb) => {
            const strm = getValidLiveStream(userId, cb)
            if (strm) {
                //not allow comment in not-live-yet stream
                if (strm.videoStreamStatusHistory.length === 1) {
                    return cb({ success: false, message: 'Bạn không thể bình luận khi phiên stream chưa bắt đầu', errorCode: 0 })
                }
                //calc current time in video:
                const lastStatusObject = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1]
                let currentVideoTime = Date.now()
                if (lastStatusObject.statusCode === StreamVideoStatus.INTERRUPT) {
                    currentVideoTime = lastStatusObject.time - Math.floor(Math.random() * 789 + 234)
                }
                let payload = {
                    userId,
                    name: userName,
                    inStreamAt: convertRealTimeToVideoTime(strm.streamId, currentVideoTime),
                    message: msg
                }
                strm.messages.push(payload)
                streamSessions.set(strm.streamId, strm)
                emitToStream(strm.streamId, eventKeys.STREAM_CHAT_MESSAGE, payload)
                cb({ success: true })
            }
        })

        socket.on(eventKeys.SELLER_SET_CURRENT_PRODUCT_INDEX, (productIndex, cb) => {
            const strm = getValidLiveStream(userId, cb, storeId)
            if (strm) {
                const lastVideoStatusCode = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].statusCode
                if (lastVideoStatusCode !== StreamVideoStatus.START) {
                    return cb({ success: false, message: 'Bạn không được đổi sản phẩm đang giới thiệu khi việc phát video bị gián đoạn', errorCode: 0 });
                }

                if (typeof (strm.products[productIndex]) === 'undefined') {
                    return cb({ success: false, message: 'Sản phẩm nằm ngoài danh mục đang phát, có thể xuất phát từ lỗi ứng dụng', errorCode: 0 })
                }

                const inStreamAt = convertRealTimeToVideoTime(strm.streamId, Date.now())
                strm['currentProductIndex'] = productIndex
                strm.products[productIndex].inStreamAts.push(inStreamAt)
                streamSessions.set(strm.streamId, strm)
                cb({ success: true })
                emitToStream(strm.streamId, eventKeys.STREAM_UPDATE_CURRENT_PRODUCT_INDEX, { productIndex, inStreamAt })
            }
        })

        socket.on(eventKeys.SELLER_GET_PUBLISH_TOKEN, (p, cb) => {
            const strm = getValidLiveStream(userId, cb, storeId)
            if (strm) {
                const lastVideoStatusCode = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].statusCode
                if (lastVideoStatusCode === StreamVideoStatus.WAIT || lastVideoStatusCode === StreamVideoStatus.INTERRUPT) {
                    const tok = socketServices.generateStreamToken(strm.streamId, true)
                    return cb({ success: true, rtmpToken: tok })
                }
                console.log(`SELLER_GET_PUBLISH_TOKEN error : seller ${userId} is request a publish token for being live stream`, strm.videoStreamStatusHistory)
            }
        })

        socket.on(eventKeys.SELLER_PUBLISH_PLAYER_STATUS, statusCode => {
            const strm = getValidLiveStream(userId, 'naf', storeId)
            if (strm) {
                console.log(`SELLER_PUBLISH_PLAYER_STATUS seller ${userId} /w store ${storeId}: pusher status code ${statusCode}`)
                const lastVideoStatusCode = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].statusCode
                if (statusCode === 2001) {
                    if (lastVideoStatusCode === StreamVideoStatus.WAIT || lastVideoStatusCode === StreamVideoStatus.INTERRUPT) {
                        addStreamVideoStatusHistory(strm.streamId, StreamVideoStatus.START)
                        return setTimeout(()=>{
                            emitToStream(strm.streamId, eventKeys.STREAM_STATUS_UPDATE, toStreamStatusObject(strm))
                        }, 5000)
                    }
                }
                if (statusCode === 2002 || statusCode === 2004 || statusCode === 2100 || statusCode === 2101 || statusCode === 2005) {
                    if (lastVideoStatusCode === StreamVideoStatus.START) {
                        addStreamVideoStatusHistory(strm.streamId, StreamVideoStatus.INTERRUPT)
                        return emitToStream(strm.streamId, eventKeys.STREAM_STATUS_UPDATE, toStreamStatusObject(strm))
                    }
                }
            }
        })

        socket.on(eventKeys.SELLER_UPDATE_STREAMPRICE, (payload, cb) => {
            const { productIndex, streamPrice } = payload
            const strm = getValidLiveStream(userId, cb, storeId)
            if (strm) {
                strm['streamPrice'] = streamPrice
                streamSessions.set(strm.streamId, strm)
                cb({ success: true })
                emitToStream(strm.streamId, eventKeys.STREAM_UPDATE_STREAMPRICE, { productIndex, streamPrice })
                console.log(`SELLER_UPDATE_STREAMPRICE: seller ${userId} updated stream price ${streamPrice} for product index ${productIndex} in stream ${strm.streamId}`)
            }
        })

        socket.on(eventKeys.USER_ADD_PRODUCT_TO_CART, async (payload, cb) => {
            const { productIndex, isReliable, variantIndex, quantity } = payload
            const strm = getValidLiveStream(userId, cb)
            if (strm) {
                const productId = typeof (strm.products[productIndex].productId) === 'undefined' ? null : strm.products[productIndex].productId
                if (productId) {
                    const result = await addProductToCart(productId, quantity, variantIndex, userId, isReliable)
                    if (result.cart) {
                        if (isReliable) emitToStream(strm.streamId, eventKeys.STREAM_PRODUCT_QUANTITY, { productIndex, variantIndex, quantity: result.newProductQuantity })
                        return cb({ success: true, message: `Đã thêm vào giỏ hàng!` })
                    }
                }
            }
        })

        socket.on(eventKeys.USER_LIKE, (isUnlike, cb) => {
            const strm = getValidLiveStream(userId, cb)
            if (strm) {
                let iUL = false
                isUnlike && (iUL = true)
                const isSuccess = updateLikedUsers(strm.streamId, userId, iUL)
                if (isSuccess) {
                    return cb({ success: true, isUnlike: iUL })
                }
                return cb({ success: false, message: 'Không thể thao tác thích/bỏ thích lúc này', errorCode: 0 })
            }
        })

        socket.on('disconnect', reason => {
            console.log(`Socket: user ${userId} disconnected with reason ${reason}`)
            //check for store owner behavior
            let strm = getValidLiveStream(userId, 'naf', storeId)
            if (strm) {
                const lastVideoStatusCode = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].statusCode
                if (lastVideoStatusCode === StreamVideoStatus.START) {
                    addStreamVideoStatusHistory(strm.streamId, StreamVideoStatus.INTERRUPT)
                    emitToStream(strm.streamId, eventKeys.STREAM_STATUS_UPDATE, toStreamStatusObject(strm))
                }

                const lastVideoStatusTime = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].time

                //"freeze" the input to timeout function handling
                const triggerTimeout = function (streamId, lastVideoStatusTime) {
                    setTimeout(() => {
                        sellerInterruptHandler(streamId, lastVideoStatusTime)
                    }, STREAM_INTERRUPT_TIMEOUT_SECS * 1000)
                }

                triggerTimeout(strm.streamId, lastVideoStatusTime)

            }

            //check for normal user behavior
            strm = getValidLiveStream(userId, 'naf')
            if (strm) {
                socket.leave(strm.streamId)
                socketServices.removeStreamWithUserId(userId)
                updateStreamViewCount(userId, strm.streamId, false)
            }
        })

    })
}

const userJoinsStream = (socket, streamId) => {
    try {
        const { userId, userName } = socket.user_payload
        socketServices.setStreamWithUserId(userId, streamId)
        socket.join(streamId)
        emitToStream(streamId, eventKeys.STREAM_MESSAGE, toMessageObject('message', `${userName} đã tham gia`))
        updateStreamViewCount(userId, streamId, true)
    }
    catch (error) {
        console.log(`userJoinsStream error: `, error)
        emitToStream(streamId, eventKeys.SERVER_MESSAGE, toMessageObject('error', `Lỗi từ hệ thống: ${error}`))
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

const updateStreamViewCount = (userId, streamId, isInc) => {
    if (streamSessions.has(streamId)) {
        let strm = streamSessions.get(streamId)
        let { participants } = strm

        console.log(`Socket: stream ${streamId}'s participants change: `, participants)

        if (isInc) {
            participants.push(userId)
            participants = [...new Set(participants)]
        } else {
            const removeIndx = participants.indexOf(userId)
            removeIndx > -1 && participants.splice(removeIndx, 1)
        }

        strm.participants = participants
        streamSessions.set(streamId, strm)
        emitToStream(streamId, eventKeys.STREAM_COUNT_VIEWS, participants.length)
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

// This function converts "absolute" point of timestamp (milliseconds) to "relative" time in video (for seeking)
//returns -1 if is not a valid
const convertRealTimeToVideoTime = (streamId, time) => {
    const stream = streamSessions.get(streamId)
    if (stream) {
        const history = stream.videoStreamStatusHistory
        if (history.length <= 1) return -1
        if (history[1].statusCode !== StreamVideoStatus.START) return -1
        const startTime = history[1].time
        if (!history[2]) return (Math.floor((time - startTime) / 1000.0))
        if (history[2].statusCode === StreamVideoStatus.END) {
            //if endTime > startTime then it is valid time
            if (history[2].time > time) return (Math.floor((time - startTime) / 1000.0))
            return -1
        }
        let delay = 0
        let eventIndex = 2
        let resumeTime = 0
        let interruptTime = 0
        while (history[eventIndex].time <= time) {
            const h = history[eventIndex]
            if (h.statusCode === StreamVideoStatus.INTERRUPT) {
                interruptTime = h.time
                resumeTime = 0
            }
            if (h.statusCode === StreamVideoStatus.START) {
                resumeTime = h.time
                interruptTime !== 0 && (delay += resumeTime - interruptTime)
                interruptTime = 0
            }
            eventIndex++;
        }
        return (Math.floor((time - startTime - delay) / 1000.0))
    }
    return -1
}

const endStreamHandler = (streamId, cb) => {
    console.log(`endStreamHandler started for stream ${streamId}`)
    socketServices.addStreamVideoStatusHistory(streamId, StreamVideoStatus.END)
    const strm = streamSessions.get(streamId)
    const streamStatusObj = toStreamStatusObject(strm)
    emitToStream(streamId, eventKeys.STREAM_STATUS_UPDATE, streamStatusObj)

    //find the stream of storeId
    StreamModel.findById(streamId).then(async stream => {
        console.log(`endStreamHandler: DB saving for stream ${streamId}`)
        if (stream === null) {
            cb({ success: false, message: 'Không tồn tại stream trong db nhưng lại có trong streamSessions', errorCode: 2 })
        } else {
            let streamId = stream._id.toString()
            if (stream.endTime !== Number.MAX_SAFE_INTEGER) {
                return cb({ success: false, message: 'Lỗi khi triển khai stream, bạn cần thoát màn hình stream và quay lại', errorCode: 2 })
            }
            //Archive the stream
            stream.messages = strm.messages
            stream.endTime = Date.now()
            stream.products = strm.products
            stream.markModified('messages')
            stream.markModified('endTime')
            stream.markModified('products')
            await stream.save()

            let productIds = []
            strm.products.forEach(p => {
                productIds.push(p.productId)
            })

            //Add stream to products
            await ProductModel.updateMany({ _id: { $in: productIds } }, { $push: { inStreams: streamId } })

            socketServices.removeFromProductSessions(productIds)
            streamSessions.delete(streamId)
            return cb({ success: true })
        }
    }).catch(error => {
        console.log(`endStreamHandler error: `, error)
        cb({ success: false, message: `Lỗi từ hệ thống: ${error}`, errorCode: 2 })
    })
}

const sellerInterruptHandler = (streamId, lastVideoStatusTime) => {
    console.log(`sellerInterruptHandler: caused by stream ${streamId} interrupt timeout`)
    const strm = streamSessions.get(streamId)
    if (strm) {
        const lvst = strm.videoStreamStatusHistory[strm.videoStreamStatusHistory.length - 1].time
        if (lvst !== lastVideoStatusTime) {
            return console.log(`sellerInterruptHandler: different events triggered, no need to end`)
        }
        const cb = console.log
        endStreamHandler(strm.streamId, cb)
    }
}

module.exports = {
    initIoServer,
    emitToStream,
}
