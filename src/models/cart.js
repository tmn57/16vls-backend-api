const { Schema, model } = require('mongoose')

const cartSchema = new Schema(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
        products: 
        [{
            expiredTime: {type: Number, default: -1}, 
            reliablePrice: { type: Number, default: -1 }, // if <= -1 ? is normal product : is reliable added product 
            productId: { type: Schema.Types.ObjectId, ref: 'Product' },
            variantIndex: { type: Number, default: 0 },
            qty: { type: Number, default: 1 }
        }],
    }, 
    {
        versionKey: false,
    }
)

module.exports = model('Cart', cartSchema)
