const { Schema, model } = require('mongoose')

const cartSchema = new Schema(
    {
        ownerId: String,
        products: 
        [{
            expiredTime: {type: Number, default: -1}, 
            reliablePrice: { type: Number, default: -1 }, // if <= -1 ? is normal product : is reliable added product 
            productId: String,
            variantIndex: { type: Number, default: 0 },
            quantity: { type: Number, default: 1 }
        }],
    }, 
    {
        versionKey: false,
    }
)

module.exports = model('Cart', cartSchema)
