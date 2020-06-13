const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Cart = require('../models/cart')
const Order = require('../models/order')
const Product = require('../models/product')
const asyncHandler = require('express-async-handler')

router.post('/create', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { listProducts, shippingAddress } = req.body


    if (!listProducts || !shippingAddress) {
        return res.status(400).json({
            success: false,
            message: "Required field: products, shippingAddress"
        })
    }
    // check còn sp k
    for (let i = 0; i < listProducts.length; i++) {
        for (let j = 0; j < listProducts[i].products.length; j++) {
            const product = await Product.findById({ _id: listProducts[i].products[j].productId })
            if (product.variants[listProducts[i].products[j].variantIndex].quantity < listProducts[i].products[j].quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Product is out of stock"
                })
            }
        }
    }

    // Nếu còn thì tạo đơn hàng, cập nhật lại số lượng sản phẩm của shop, xóa sp trong giỏ hàng của khách hàng hiện tạo
    for (let i = 0; i < listProducts.length; i++) {
        let total = 0
        let lstProducts = []
        for (let j = 0; j < listProducts[i].products.length; j++) {
            const product = await Product.findById({ _id: listProducts[i].products[j].productId })
            total = total + product.price

            product.variants[listProducts[i].products[j].variantIndex].quantity = product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity

            await product.save()

            let obj = {
                productId: listProducts[i].products[j].productId,
                variantIndex: listProducts[i].products[j].variantIndex,
                quantity: listProducts[i].products[j].quantity
            }
            lstProducts.push(obj)
        }

        const newOrder = new Order()
        newOrder.products = [...lstProducts]
        newOrder.storeId = listProducts[i].storeId
        newOrder.shippingAddress = shippingAddress
        newOrder.userId = userId
        newOrder.createdBy = userId
        newOrder.totalMoney = total
        // newOrder.transportationCost = listProducts[i].transportationCost
        await newOrder.save()

    }
    // remove Cart
    const cart = await Cart.findOne({ userId })
    cart.products = cart.products.splice(0, cart.products.length)
    cart.products = []
    await cart.save()



    // listProducts = [
    //     {
    //         "storeId": "5ed2643f9044f51c90999f31",
    //         "transportationCost": 123123,
    //         "products": [

    //             {
    //                 "expiredTime": 9007199254740991,
    //                 "reliablePrice": 0,
    //                 "variantIndex": 1,
    //                 "quantity": 4,
    //                 "productId": "5ed2672a9044f51c90999f35",
    //             },

    //             {
    //                 "variant": {
    //                     "color": "red",
    //                     "size": "M"
    //                 },
    //                 "expiredTime": 9007199254740991,
    //                 "reliablePrice": 0,
    //                 "variantIndex": 0,
    //                 "quantity": 2,
    //                 "productId": "5ed65c9300a1343be40552b3",
    //             }
    //         ]
    //     },
    //     {
    //         "storeId": "5ed1ec3d7caf1b0ca93afc09",
    //         "transportationCost": 123123,
    //         "products": [
    //             {
    //                 "variant": {
    //                     "color": "hong",
    //                     "size": "Xl"
    //                 },
    //                 "expiredTime": 9007199254740991,
    //                 "reliablePrice": 0,
    //                 "variantIndex": 0,
    //                 "quantity": 1,
    //                 "productId": "5ed663f5fbef61459865b5fd",
    //             }
    //         ]
    //     }
    // ]



}))

// Xem trạng thái đơn hàng gồm: 
// - đang chờ duyệt (có thể hủy)
// - đang vận chuyển
// - đã hoàn thành (khách nhận thành công)
// - đã bị shop từ chối
router.get('/info', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload

    const orderPendding = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'PEDDING' }] })

    const orderInTransit = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'APPROVED' }] })

    const orderComplete = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'APPROVED' }] })

    const orderReject = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'REJECT' }] })

    let listStatusOrder = []
    listStatusOrder.push(orderPendding)
    listStatusOrder.push(orderInTransit)
    listStatusOrder.push(orderComplete)
    listStatusOrder.push(orderReject)

    return res.status(200).json({
        success: true,
        result: listStatusOrder
    })
}))

router.get('/infoOrderPendding', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderPendding = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'PEDDING' }] })
    return res.status(200).json({
        success: true,
        result: orderPendding
    })
}))

router.get('/infoOrderInTransit', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderInTransit = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'APPROVED' }] })
    return res.status(200).json({
        success: true,
        result: orderInTransit
    })
}))

router.get('/infoOrderComplete', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderComplete = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'APPROVED' }] })
    return res.status(200).json({
        success: true,
        result: orderComplete
    })
}))

router.get('/infoOrderReject', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderReject = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'REJECT' }] })
    return res.status(200).json({
        success: true,
        result: orderReject
    })
}))

router.post('/cancelOrder', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { orderId } = req.body

    const order = await Order.findOne({ $and: [{ _id: orderId }, { userId: userId }, { status: 'PEDDING' }] })

    if (!order) {
        return res.status(400).json({
            success: false,
            message: 'Order not found!'
        })
    }
    const result = await Order.deleteOne({ _id: orderId });
    if (result.n == 1) {
        return res.status(200).json({
            success: true,
            message: 'Cancel Order successfully!',
        })
    }
    else {
        return res.status(400).json({
            success: false,
            message: 'Cancel Order failed!',
        })
    }

}))

// router.post('/orderComplete', asyncHandler(async (req, res, next) => {
//     const { userId } = req.tokenPayload
//     const { orderId } = req.body

//     const order = await Order.findOne({ $and: [{ _id: orderId }, { userId: userId }, { isCompleted: false }, { status: 'APPROVED' }] })

//     if (!order) {
//         return res.status(400).json({
//             success: false,
//             message: 'Order not found!'
//         })
//     }

//     order.isCompleted = true
//     await order.save()

//     return res.status(200).json({
//         success: true,
//         message: 'Order is completed!',
//     })


// }))

module.exports = router
