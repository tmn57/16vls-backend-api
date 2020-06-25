const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Cart = require('../models/cart')
const User = require('../models/user')
const Store = require('../models/store')
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
            const product1 = await Product.findById(listProducts[i].products[j].productId)
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

            const product = await Product.findById(listProducts[i].products[j].productId)
            if (product.promotionPrice == 0) {
                total = total + product.price * listProducts[i].products[j].quantity
            }
            else {
                total = total + product.promotionPrice * listProducts[i].products[j].quantity
            }

            product.variants[listProducts[i].products[j].variantIndex].quantity = product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity

            // let objVariant = {
            //     color: product.variants[listProducts[i].products[j].variantIndex].color,
            //     size: product.variants[listProducts[i].products[j].variantIndex].size,
            //     quantity: product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity
            // }
            // product.variants[listProducts[i].products[j].variantIndex] = objVariant
            let tmpVariants = product.variants
            product.variants = tmpVariants
            // product.variants = [...product.variants]

            await product.save();
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
    let listOrders = []
    const user = await User.findById(userId)

    for (let i = 0; i < orderPendding.length; i++) {
        const store = await Store.findById(orderPendding[i].storeId)

        let listProductsOrder = []
        for (let j = 0; j < orderPendding[i].products.length; j++) {
            const product = await Product.findById(orderPendding[i].products[j].productId)
            let objProduct = {
                productId: orderPendding[i].products[j].productId,
                variantIndex: orderPendding[i].products[j].variantIndex,
                quantity: orderPendding[i].products[j].quantity,
                productName: product.name,
                productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
                productImage: product.images.length > 0 ? product.images[0] : '',
                productVariant: {
                    color: product.variants[orderPendding[i].products[j].variantIndex].color,
                    size: product.variants[orderPendding[i].products[j].variantIndex].size
                }

            }
            listProductsOrder.push(objProduct)
        }

        let d = new Date(orderPendding[i].createdAt)

        let objOrder = {
            _id: orderPendding[i]._id,
            status: orderPendding[i].status,
            products: [...listProductsOrder],
            isCompleted: orderPendding[i].isCompleted,
            storeId: orderPendding[i].storeId,
            totalMoney: orderPendding[i].totalMoney,
            description: orderPendding[i].description,
            transportationCost: orderPendding[i].transportationCost,
            shippingAddress: orderPendding[i].shippingAddress,
            userId: orderPendding[i].userId,
            userPhone: user.phone,
            userName: user.name,
            storeAvatar: store.avatar ? store.avatar : '',
            storeName: store.name,
            createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
                + '/' +
                ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
                + '/' +
                d.getFullYear()
        }
        listOrders.push(objOrder)
    }
    return res.status(200).json({
        success: true,
        result: listOrders
    })
}))

router.get('/infoOrderInTransit', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderInTransit = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'APPROVED' }] })

    let listOrders = []
    const user = await User.findById(userId)

    for (let i = 0; i < orderInTransit.length; i++) {
        const store = await Store.findById(orderInTransit[i].storeId)

        let listProductsOrder = []
        for (let j = 0; j < orderInTransit[i].products.length; j++) {
            const product = await Product.findById(orderInTransit[i].products[j].productId)
            let objProduct = {
                productId: orderInTransit[i].products[j].productId,
                variantIndex: orderInTransit[i].products[j].variantIndex,
                quantity: orderInTransit[i].products[j].quantity,
                productName: product.name,
                productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
                productImage: product.images.length > 0 ? product.images[0] : '',
                productVariant: {
                    color: product.variants[orderInTransit[i].products[j].variantIndex].color,
                    size: product.variants[orderInTransit[i].products[j].variantIndex].size
                }
            }
            listProductsOrder.push(objProduct)
        }

        let d = new Date(orderInTransit[i].createdAt)

        let objOrder = {
            _id: orderInTransit[i]._id,
            status: orderInTransit[i].status,
            products: [...listProductsOrder],
            isCompleted: orderInTransit[i].isCompleted,
            storeId: orderInTransit[i].storeId,
            totalMoney: orderInTransit[i].totalMoney,
            description: orderInTransit[i].description,
            transportationCost: orderInTransit[i].transportationCost,
            shippingAddress: orderInTransit[i].shippingAddress,
            userId: orderInTransit[i].userId,
            userPhone: user.phone,
            userName: user.name,
            storeAvatar: store.avatar ? store.avatar : '',
            storeName: store.name,
            createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
                + '/' +
                ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
                + '/' +
                d.getFullYear()
        }
        listOrders.push(objOrder)
    }

    return res.status(200).json({
        success: true,
        result: listOrders
    })
}))

router.get('/infoOrderComplete', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderComplete = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'APPROVED' }] })

    let listOrders = []
    const user = await User.findById(userId)

    for (let i = 0; i < orderComplete.length; i++) {
        const store = await Store.findById(orderComplete[i].storeId)

        let listProductsOrder = []
        for (let j = 0; j < orderComplete[i].products.length; j++) {
            const product = await Product.findById(orderComplete[i].products[j].productId)
            let objProduct = {
                productId: orderComplete[i].products[j].productId,
                variantIndex: orderComplete[i].products[j].variantIndex,
                quantity: orderComplete[i].products[j].quantity,
                productName: product.name,
                productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
                productImage: product.images.length > 0 ? product.images[0] : '',
                productVariant: {
                    color: product.variants[orderComplete[i].products[j].variantIndex].color,
                    size: product.variants[orderComplete[i].products[j].variantIndex].size
                }
            }
            listProductsOrder.push(objProduct)
        }

        let d = new Date(orderComplete[i].createdAt)

        let objOrder = {
            _id: orderComplete[i]._id,
            status: orderComplete[i].status,
            products: [...listProductsOrder],
            isCompleted: orderComplete[i].isCompleted,
            storeId: orderComplete[i].storeId,
            totalMoney: orderComplete[i].totalMoney,
            description: orderComplete[i].description,
            transportationCost: orderComplete[i].transportationCost,
            shippingAddress: orderComplete[i].shippingAddress,
            userId: orderComplete[i].userId,
            userPhone: user.phone,
            userName: user.name,
            storeAvatar: store.avatar ? store.avatar : '',
            storeName: store.name,
            createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
                + '/' +
                ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
                + '/' +
                d.getFullYear()
        }
        listOrders.push(objOrder)
    }

    return res.status(200).json({
        success: true,
        result: listOrders
    })
}))

router.get('/infoOrderReject', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const orderReject = await Order.find({ $and: [{ userId: userId }, { isCompleted: true }, { status: 'REJECT' }] })
    let listOrders = []
    const user = await User.findById(userId)

    for (let i = 0; i < orderReject.length; i++) {
        const store = await Store.findById(orderReject[i].storeId)

        let listProductsOrder = []
        for (let j = 0; j < orderReject[i].products.length; j++) {
            const product = await Product.findById(orderReject[i].products[j].productId)
            let objProduct = {
                productId: orderReject[i].products[j].productId,
                variantIndex: orderReject[i].products[j].variantIndex,
                quantity: orderReject[i].products[j].quantity,
                productName: product.name,
                productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
                productImage: product.images.length > 0 ? product.images[0] : '',
                productVariant: {
                    color: product.variants[orderReject[i].products[j].variantIndex].color,
                    size: product.variants[orderReject[i].products[j].variantIndex].size
                }
            }
            listProductsOrder.push(objProduct)
        }

        let d = new Date(orderReject[i].createdAt)

        let objOrder = {
            _id: orderReject[i]._id,
            status: orderReject[i].status,
            products: [...listProductsOrder],
            isCompleted: orderReject[i].isCompleted,
            storeId: orderReject[i].storeId,
            totalMoney: orderReject[i].totalMoney,
            description: orderReject[i].description,
            transportationCost: orderReject[i].transportationCost,
            shippingAddress: orderReject[i].shippingAddress,
            userId: orderReject[i].userId,
            userPhone: user.phone,
            userName: user.name,
            storeAvatar: store.avatar ? store.avatar : '',
            storeName: store.name,
            createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
                + '/' +
                ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
                + '/' +
                d.getFullYear(),
            isUserReject: orderReject[i].createdBy == orderReject[i].updatedBy
        }
        listOrders.push(objOrder)
    }

    return res.status(200).json({
        success: true,
        result: listOrders
    })
}))

router.post('/cancelOrder', asyncHandler(async (req, res, next) => {
    // cộng lại quantity
    const { userId } = req.tokenPayload
    const { orderId } = req.body

    const order = await Order.findOne({ $and: [{ _id: orderId }, { userId: userId }, { status: 'PEDDING' }] })

    if (!order) {
        return res.status(400).json({
            success: false,
            message: 'Order not found!'
        })
    }

    for (let i = 0; i < order.products.length; i++) {
        const product = await Product.findById(order.products[i].productId)
        product.variants[order.products[i].variantIndex].quantity = product.variants[order.products[i].variantIndex].quantity + order.products[i].quantity
        await product.save()
    }

    order.status = 'REJECT'
    order.isCompleted = true
    order.updatedBy = userId
    order.updatedAt = +new Date()
    await order.save();

    return res.status(200).json({
        success: true,
        message: 'Cancel Order successfully!',
        result: order
    })

    // const result = await Order.deleteOne({ _id: orderId });
    // if (result.n == 1) {
    //     return res.status(200).json({
    //         success: true,
    //         message: 'Cancel Order successfully!',
    //     })
    // }
    // else {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Cancel Order failed!',
    //     })
    // }

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
