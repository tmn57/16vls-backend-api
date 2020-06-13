const { Schema, model } = require('mongoose')

//json response: streamPrice, // checkProductStream(productId) --> >=0 : live product, -1: normal product

const cartSchema = new Schema(
    {
        ownerId: String,
        userId: String,
        products: 
        [{
            expiredTime: {type: Number, default: Number.MAX_SAFE_INTEGER}, //normal prod: MAX_SAFE_INTEGER, else: reliable prod
            reliablePrice: { type: Number, default: 0 }, // if 0 ? is normal product : is reliable added product 
            productId: String,
            productName: String,
            productImage: String,
            productPrice: { type: Number, default: 0 },
            storeId: String,
            variant:{
                color: String,
                size: String
            },
            variantIndex: { type: Number, default: 0 },
            quantity: { type: Number, default: 1 }
        }],
    }, 
    {
        versionKey: false,
    }
)

module.exports = model('Cart', cartSchema)
