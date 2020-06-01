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
    status: { type: String, default: 'approved' },
    products: {
      type: Array, //ProductInCart
      default: []
    },
    totalMoney: Number, // Sum([total per Product])
    description?: String,
    transportationCost: Number,
    shippingAddress: String,
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
