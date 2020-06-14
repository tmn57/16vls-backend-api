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
            const product1 = await Product.findById({ _id: listProducts[i].products[j].productId })
            if (product1.variants[listProducts[i].products[j].variantIndex].quantity < listProducts[i].products[j].quantity) {
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

            let obj = {
                productId: listProducts[i].products[j].productId,
                variantIndex: listProducts[i].products[j].variantIndex,
                quantity: listProducts[i].products[j].quantity
            }
            lstProducts.push(obj)

            const product = await Product.findById({ _id: listProducts[i].products[j].productId })
            if (product.promotionPrice == 0) {
                total = total + product.price * listProducts[i].products[j].quantity
            }
            else {
                total = total + product.promotionPrice * listProducts[i].products[j].quantity
            }


            // product.variants[listProducts[i].products[j].variantIndex].quantity = product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity
            let objVariant = {
                color: product.variants[listProducts[i].products[j].variantIndex].color,
                size: product.variants[listProducts[i].products[j].variantIndex].size,
                quantity: product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity
            }

            console.log(objVariant)

            product.variants[listProducts[i].products[j].variantIndex] = objVariant
            await product.save()
        }

        const order = await Order.findOne({ $and: [{ userId: userId }, { storeId: listProducts[i].storeId }, { isCompleted: false }, { status: 'PEDDING' }] })

        if (order) {
            // order.products.concat(lstProducts)
            for (let k = 0; k < lstProducts.length; k++) {
                let check = false
                for (let t = 0; t < order.products.length; t++) {
                    if (order.products[t].productId == lstProducts[k].productId && order.products[t].variantIndex == lstProducts[k].variantIndex) {
                        check = true
                        order.products[t].quantity = order.products[t].quantity + lstProducts[k].quantity
                        break
                    }
                }
                if (!check) {
                    order.products.push(lstProducts[k])
                }
            }

            order.totalMoney = order.totalMoney + total
            await order.save()
        }

        else {
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
    }
    // remove Cart
    const cart = await Cart.findOne({ userId })
    cart.products = cart.products.splice(0, cart.products.length)
    cart.products = []
    await cart.save()


    return res.status(200).json({
        success: true,
        message: "Order is successfully!"
    })

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
