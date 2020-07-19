const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Cart = require('../models/cart')
const User = require('../models/user')
const Store = require('../models/store')
const Order = require('../models/order')
const Product = require('../models/product')
const asyncHandler = require('express-async-handler')
const { checkProductLiveStream, onChangeQuantityProductVariant } = require('../services/product')
const NotificationService = require('../services/notification')
const dayjs = require('dayjs')

router.post('/create', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { listProducts, shippingAddress } = req.body


    if (!listProducts || !shippingAddress) {
        return res.status(400).json({
            success: false,
            message: "Required fields: products, shippingAddress"
        })
    }
    // check còn sp k
    for (let i = 0; i < listProducts.length; i++) {
        for (let j = 0; j < listProducts[i].products.length; j++) {
            const product1 = await Product.findById(listProducts[i].products[j].productId)
            if (product1.variants[listProducts[i].products[j].variantIndex].quantity < listProducts[i].products[j].quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Sản phẩm trong kho hàng đã hết"
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
                quantity: listProducts[i].products[j].quantity,
                // NEW
                reliablePrice: listProducts[i].products[j].reliablePrice
                // END NEW
            }
            lstProducts.push(obj)

            const product = await Product.findById(listProducts[i].products[j].productId)
            

            let checkProductStream = checkProductLiveStream(product)
            total = total + product.price * listProducts[i].products[j].quantity
            //NEW
            if (listProducts[i].products[j].reliablePrice != 0) {
                total = total + listProducts[i].products[j].reliablePrice * listProducts[i].products[j].quantity
            }
            else if (checkProductStream != null) {
                total = total + checkProductStream.streamPrice * listProducts[i].products[j].quantity
            }
            //END NEW

            // let listVariantsProduct = product.variants
            // listVariantsProduct[listProducts[i].products[j].variantIndex].quantity = listVariantsProduct[listProducts[i].products[j].variantIndex].quantity- listProducts[i].products[j].quantity
            // console.log(listVariantsProduct, listVariantsProduct[listProducts[i].products[j].variantIndex].quantity)
            // product.variants = listVariantsProduct
            let listVariantsProduct = []
            for (let k = 0; k < product.variants.length; k++) {
                let objVariantInProduct = {}
                objVariantInProduct.color = product.variants[k].color
                objVariantInProduct.size = product.variants[k].size
                if (k == listProducts[i].products[j].variantIndex) {
                    objVariantInProduct.quantity = product.variants[k].quantity - listProducts[i].products[j].quantity
                }
                else {
                    objVariantInProduct.quantity = product.variants[k].quantity
                }
                listVariantsProduct.push(objVariantInProduct)
            }
            product.variants = listVariantsProduct
            // product.variants[listProducts[i].products[j].variantIndex].quantity = product.variants[listProducts[i].products[j].variantIndex].quantity - listProducts[i].products[j].quantity

            await product.save();
        }

        const order = await Order.findOne({ $and: [{ userId: userId }, { storeId: listProducts[i].storeId }, { isCompleted: false }, { status: 'PENDING' }] })

        if (order) {
            // order.products.concat(lstProducts)
            for (let k = 0; k < lstProducts.length; k++) {
                let check = false
                for (let t = 0; t < order.products.length; t++) {
                    // Update
                    if (order.products[t].productId == lstProducts[k].productId && order.products[t].variantIndex == lstProducts[k].variantIndex
                        && order.products[t].reliablePrice == lstProducts[k].reliablePrice) {
                    // end update
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

            const store = await Store.findById(listProducts[i].storeId)
            if (store) {
                await NotificationService.sendToSingle(
                    'Khách đặt đơn hàng',
                    'Có một khách hàng vừa đặt đơn tại cửa hàng của bạn lúc ' + dayjs(+new Date()).locale('vi-vn').format('HH:mm DD-MM-YYYY'),
                    store.userId,
                    -1,
                    { target: 'listOrder', params: { tabIndex: 0 } }
                )
            }
        }
    }
    // remove Cart
    const cart = await Cart.findOne({ userId })
    cart.products = cart.products.splice(0, cart.products.length)
    cart.products = []
    await cart.save()

    return res.status(200).json({
        success: true,
        message: "Tạo đơn hàng thành công"
    })

}))

// Xem trạng thái đơn hàng gồm: 
// - đang chờ duyệt (có thể hủy)
// - đang vận chuyển
// - đã hoàn thành (khách nhận thành công)
// - đã bị shop từ chối
router.get('/info', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload

    const orderPendding = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'PENDING' }] })

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
    const orderPendding = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }, { status: 'PENDING' }] })
    let listOrders = []
    const user = await User.findById(userId)

    for (let i = 0; i < orderPendding.length; i++) {
        const store = await Store.findById(orderPendding[i].storeId)

        let listProductsOrder = []
        for (let j = 0; j < orderPendding[i].products.length; j++) {
            const product = await Product.findById(orderPendding[i].products[j].productId)

            let checkProductStream = checkProductLiveStream(product)
            let price = product.price
            if (checkProductStream != null) {
                price = checkProductStream.streamPrice
            }

            let objProduct = {
                productId: orderPendding[i].products[j].productId,
                variantIndex: orderPendding[i].products[j].variantIndex,
                quantity: orderPendding[i].products[j].quantity,
                productName: product.name,
                productPrice: price,
                // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

            let checkProductStream = checkProductLiveStream(product)
            let price = product.price
            if (checkProductStream != null) {
                price = checkProductStream.streamPrice
            }

            let objProduct = {
                productId: orderInTransit[i].products[j].productId,
                variantIndex: orderInTransit[i].products[j].variantIndex,
                quantity: orderInTransit[i].products[j].quantity,
                productName: product.name,
                productPrice: price,
                // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

            let checkProductStream = checkProductLiveStream(product)
            let price = product.price
            if (checkProductStream != null) {
                price = checkProductStream.streamPrice
            }

            let objProduct = {
                productId: orderComplete[i].products[j].productId,
                variantIndex: orderComplete[i].products[j].variantIndex,
                quantity: orderComplete[i].products[j].quantity,
                productName: product.name,
                productPrice: price,
                // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

            let checkProductStream = checkProductLiveStream(product)
            let price = product.price
            if (checkProductStream != null) {
                price = checkProductStream.streamPrice
            }

            let objProduct = {
                productId: orderReject[i].products[j].productId,
                variantIndex: orderReject[i].products[j].variantIndex,
                quantity: orderReject[i].products[j].quantity,
                productName: product.name,
                productPrice: price,
                // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

    const order = await Order.findOne({ $and: [{ _id: orderId }, { userId: userId }, { status: 'PENDING' }] })

    if (!order) {
        return res.status(400).json({
            success: false,
            message: 'Không tìm thấy đơn hàng'
        })
    }

    for (let i = 0; i < order.products.length; i++) {        
        if(order.products[i].reliablePrice != 0){
            // todo: push report
            break;
        }
    }

    order.status = 'REJECT'
    order.isCompleted = true
    order.updatedBy = userId
    order.updatedAt = +new Date()
    await order.save();

    for (let i = 0; i < order.products.length; i++) {
        const product = await Product.findById(order.products[i].productId)
        // product.variants[order.products[i].variantIndex].quantity = product.variants[order.products[i].variantIndex].quantity + order.products[i].quantity
        let listVariantsProduct = []
        for (let k = 0; k < product.variants.length; k++) {
            let objVariantInProduct = {}
            objVariantInProduct.color = product.variants[k].color
            objVariantInProduct.size = product.variants[k].size
            if (k == order.products[i].variantIndex) {
                objVariantInProduct.quantity = product.variants[k].quantity + order.products[i].quantity
            }
            else {
                objVariantInProduct.quantity = product.variants[k].quantity
            }
            listVariantsProduct.push(objVariantInProduct)
        }
        product.variants = listVariantsProduct
        await product.save()        
    }


    const store = await Store.findById(order.storeId)
    if (store) {
        await NotificationService.sendToSingle(
            'Khách hủy đơn hàng',
            'Có một khách hàng vừa hủy đơn tại cửa hàng của bạn lúc ' + dayjs(+new Date()).locale('vi-vn').format('HH:mm DD-MM-YYYY'),
            store.userId,
            -1,
            { target: 'listOrder', params: { tabIndex: 2 } }
        )
    }

    return res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng thành công',
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
