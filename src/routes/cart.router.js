const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Cart = require('../models/cart')
const Product = require('../models/product')
const asyncHandler = require('express-async-handler')

router.post('/create', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { productId, quantity, color, size } = req.body

    if (!productId || !quantity || !color || !size) {
        return res.status(400).json({
            success: false,
            message: "Required field: ProductId, quantity, color, size"
        })
    }

    const product = await Product.findById({ _id: productId })

    if (!product) {
        return res.status(400).json({
            success: false,
            message: "Product not found!"
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
        variantIndex: variantIndex,
        quantity: quantity
    }

    const cart = await Cart.findOne({ userId })
    if (!cart) {
        let newCart = new Cart({
            ownerId: userId,
            userId: userId
        })
        newCart.products.push(objProduct)
        await newCart.save()
        return res.status(200).json({
            success: true,
            result: newCart
        })
    }
    else {
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
    }
}))


router.get('/info', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const cart = await Cart.findOne({ userId })
    return res.status(200).json({
        success: true,
        result: cart
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
