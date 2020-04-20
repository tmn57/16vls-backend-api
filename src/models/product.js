const { Schema, model } = require('mongoose')

const ProductSchema = new Schema(
  {
    _id: String,
    name: String,
    variants: {
      type: [Object],
      default: [{ color: 'default', size: 'default', quantity: 1, price: 1 }]
    },
    createdBy: String,
    storeId: String,
    description: String,
    images: [String],
    tags: [String], //tag.key
    streamed: {
      type: [Object], 
      default: [{ steamId: 'default', time: null }]
    },
    categories: [String],
    isEnabled: { type: Boolean, default: true },
    createdAt: { type: Number, default: +new Date() },
    updatedBy: { type: Number, default: +new Date() }
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Product', ProductSchema)
