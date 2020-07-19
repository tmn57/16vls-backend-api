const { Schema, model } = require('mongoose')

/*
const ProductInCart = {
  proId: String, //possible duplicate
  proName?: String,
  storeId?: String,
  discount: {
    code: String,
    saleOff: Number
  },
  options: {
    size: String,
    color: String,
    amount: Number, 
    price: Number
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  } //amount * price * [(100 - discount.saleOff)/100]
}
*/

const OrderSchema = new Schema(
  {
    status: { type: String, default: 'PENDING' }, // PENDING, APPROVED, REJECT
    // products: {
    //   type: Array, //ProductInCart
    //   default: []
    // },
    products: [{
      productId: String,
      variantIndex: { type: Number, default: 0 },
      quantity: { type: Number, default: 1 },
      reliablePrice: { type: Number, default: 0 }, // if 0 ? is normal product : is reliable added product 
    }],
    isCompleted: { type: Boolean, default: false },
    storeId: String,
    totalMoney: { type: Number, default: 0 }, // Sum([total per Product])
    description: { type: String, default: 'default' },
    transportationCost: { type: Number, default: 0 },
    shippingAddress: {type: String, default: ''},
    userId: String,
    createdAt: { type: Number, default: +new Date() },
    createdBy: String, //userID
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Order', OrderSchema)
