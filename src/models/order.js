const { Schema, model } = require('mongoose')

// const ProductInCart = {
//   proId: String, //possible duplicate
//   proName: String,
//   storeId: String,
//   discount: Number
//   options: {
//     size: String,
//     color: String,
//     amount: Number, 
//     price: Number
//   },
//   total: Number //amount * price * [(100 - discount)/100]
// }

const OrderSchema = new Schema(
  {
    _id: String,
    products: {
      type: Array //ProductInCart
    },
    totalMoney: Number, // Sum([total per Product])
    storeId: String,
    description: String,
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    isEnabled: { type: Boolean, default: true },
    createdBy: String,
    createdAt: { type: Number, default: +new Date() }
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Order', OrderSchema)
