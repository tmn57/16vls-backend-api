const Cart = require('../models/cart')
const Product = require('../models/product')
const { checkProductLiveStream } = require('./product')

const addProductToCart = async (productId, quantity, variantIndex, userId, isReliable) => {
    const product = await Product.findById(productId)

    if (typeof (product.variants[variantIndex]) === 'undefined') {
        console.log(`warning: user ${userId} add product ${productId} to cart but variant index ${variantIndex} not found`)
        return null
    }

    const liveProduct = checkProductLiveStream(product)
    let reliablePrice = -1

    if (liveProduct === null && isReliable) {
        console.log(`warning: user ${userId} is buying 'NOT LIVE'-product ${productId} in reliable`)
        return null
    }

    let objProduct = {
        productId,
        storeId: product.storeId,
        variantIndex: variantIndex,
        quantity: quantity,
    }

    const cart = await Cart.findOne({ userId })

    //#IF in valid reliable buy 
    if (liveProduct !== null && isReliable) {
        const { streamId, streamPrice } = liveProduct
        reliablePrice = streamPrice
        const currentProductVariantQty = product.variants[variantIndex].quantity
        if (quantity > currentProductVariantQty) {
            console.log(`warning: user ${userId} is reliable buy ${quantity} of product ${productId} but it only ${currentProductVariantQty} in stock`)
            return null
        }
        const newQty = currentProductVariantQty - quantity
        product.variants[variantIndex].quantity = newQty
        product.markModified(`variants`)
        await product.save()
        console.log(`updated quantity from ${currentProductVariantQty} to ${newQty} variant ${variantIndex} of product ${productId}`)
        objProduct['reliablePrice'] = reliablePrice
        objProduct['expiredTime'] = Date.now() + 2 * 24 * 3600 * 1000 //2 days in millisecs
        cart.products.push(objProduct);
        await cart.save()
        return { cart, newProductQuantity: newQty }
    }

    //#ELSE: normal add product to cart
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
    return { cart }
}

module.exports = {
    addProductToCart
}