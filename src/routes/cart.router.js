const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Cart = require('../models/cart')
const Store = require('../models/store')
const Product = require('../models/product')
const asyncHandler = require('express-async-handler')
const { checkProductLiveStream, onChangeQuantityProductVariant } = require('../services/product')

router.post('/create', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { productId, quantity, color, size } = req.body

    if (!productId || !quantity || !color || !size) {
        return res.status(400).json({
            success: false,
            message: "Required fields: ProductId, quantity, color, size"
        })
    }

    const product = await Product.findById(productId)

    const store = await Store.findOne({ userId })
    if (product.storeId == store._id) {
        return res.status(400).json({
            success: false,
            message: "Không thể đặt sản phẩm của chính cửa hàng mình"
        })
    }

    if (!product) {
        return res.status(400).json({
            success: false,
            message: "Không tìm thấy sản phẩm"
        })
    }

    let variantIndex = -1;
    for (let i = 0; i < product.variants.length; i++) {
        if (product.variants[i].color == color && product.variants[i].size == size) {
            variantIndex = i;
            break;
        }
    }

    let objProduct = {
        productId: productId,
        storeId: product.storeId,
        variantIndex: variantIndex,
        quantity: quantity,
    }

    const cart = await Cart.findOne({ userId })
    // if (!cart) {
    //     let newCart = new Cart({
    //         ownerId: userId,
    //         userId: userId
    //     })
    //     newCart.products.push(objProduct)
    //     await newCart.save()
    //     return res.status(200).json({
    //         success: true,
    //         result: newCart
    //     })
    // }
    // else {
    let isExisted = false;
    for (let i = 0; i < cart.products.length; i++) {
        if (cart.products[i].productId == productId && cart.products[i].variantIndex == variantIndex) {
            isExisted = true;
            cart.products[i].quantity = cart.products[i].quantity + quantity;
            break;
        }
    }
    if (!isExisted) {
        cart.products.push(objProduct);
    }
    await cart.save()
    return res.status(200).json({
        success: true,
        result: cart
    })
    // }
}))


router.get('/info', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const cart = await Cart.findOne({ userId })
    let listProductOfStore = []

    for (let i = 0; i < cart.products.length; i++) {
        const product = await Product.findById(cart.products[i].productId)
        let checkProductStream = checkProductLiveStream(product)
        let price = product.price
        if (checkProductStream != null) {
            price = checkProductStream.streamPrice
        }
        let obj = {
            expiredTime: cart.products[i].expiredTime,
            reliablePrice: cart.products[i].reliablePrice,
            productId: cart.products[i].productId,
            variantIndex: cart.products[i].variantIndex,
            quantity: cart.products[i].quantity,
            productName: product.name,
            productImage: product.images[0],
            productPrice: price,
            // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
            productVariant: {
                color: product.variants[cart.products[i].variantIndex].color,
                size: product.variants[cart.products[i].variantIndex].size
            }
        }
        let check = false;
        for (let j = 0; j < listProductOfStore.length; j++) {
            if (listProductOfStore[j].storeId == cart.products[i].storeId) {
                // listProductOfStore[j].products.push(cart.products[i])
                listProductOfStore[j].products.push(obj)
                check = true
                break;
            }
        }
        if (!check) {
            const store = await Store.findById(cart.products[i].storeId)
            listProductOfStore.push({
                storeId: cart.products[i].storeId,
                storeName: store.name,
                storeAddress: store.address,
                storeAvatar: store.avatar ? store.avatar : '',
                storePhone: store.phone,
                storeEmail: store.email,
                products: [obj]
                // products: [cart.products[i]]
            })
        }
    }

    return res.status(200).json({
        success: true,
        result: listProductOfStore
    })
}))

router.post('/updateQuantityProduct', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { productId, quantity, variantIndex } = req.body

    // if (!productId || !quantity || !variantIndex) {
    //     return res.status(400).json({
    //         success: false,
    //         message: "Required field: ProductId, quantity, variantIndex"
    //     })
    // }

    const cart = await Cart.findOne({ userId })
    for (let i = 0; i < cart.products.length; i++) {
        if (cart.products[i].productId == productId && cart.products[i].variantIndex == variantIndex) {
            cart.products[i].quantity = quantity;
            break;
        }
    }

    await cart.save()

    return res.status(200).json({
        success: true,
        result: cart
    })
}))


router.post('/removeProduct', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { productId, variantIndex } = req.body

    // const { productId, quantity, color, size } = req.body
    // if (!productId || !variantIndex) {
    //     return res.status(400).json({
    //         success: false,
    //         message: "Required field: ProductId, variantIndex"
    //     })
    // }

    const cart = await Cart.findOne({ userId })
    let index = -1;
    for (let i = 0; i < cart.products.length; i++) {
        if (cart.products[i].productId == productId && cart.products[i].variantIndex == variantIndex) {
            index = i;
            break;
        }
    }

    cart.products.splice(index, 1)

    await cart.save()
    return res.status(200).json({
        success: true,
        result: cart
    })
}))


module.exports = router
