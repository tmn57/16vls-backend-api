const Cart = require('../models/cart')
const Product = require('../models/product')

//output: cart
const addProductToCart = (productId, quantity, color, size, userId, reliablePrice) => {
    const product = await Product.findById(productId)

    let variantIndex = -1;
    for (let i = 0; i < product.variants.length; i++) {
        if (product.variants[i].color == color && product.variants[i].size == size) {
            variantIndex = i;
            break;
        }
    }

    let objProduct = {
        reliablePrice: reliablePrice,
        productId: productId,
        storeId: product.storeId,
        variantIndex: variantIndex,
        quantity: quantity,
    }

    const cart = await Cart.findOne({ userId })
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
    return cart
}

module.exports = {
    addProductToCart
}