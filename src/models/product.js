const { Schema, model } = require('mongoose')

const ProductSchema = new Schema(
  {
    name: String,
    discount: {
      code: {
        type: String,
        default: 'none'
      },
      saleOff: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    variants: {
      type: Array,
      default: [
        {
          color: 'default',
          size: 'default',
          quantity: 1,
          price: 1
        }
      ]
    },
    createdBy: String,
    storeId: String,
    description: String,
    images: [String],
    tags: [String], //tag.key
    streamed: {
      type: Array,
      default: [{ streamId: 'default', time: null }]
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
