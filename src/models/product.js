const { Schema, model } = require('mongoose');
const { checkProductLiveStream } = require('../services/product');
const { NotExtended } = require('http-errors');

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
          quantity: 1
        }
      ]
    },
    price: Number,
    promotionPrice: { type: Number, default: 0 },
    storeId: String,
    code: String,
    description: String,
    images: [String],
    tags: [String], //tag.key
    inStreams: [String], //streamId 
    categorySystemId: String,
    category: String,
    statusCode: String,
    isEnabled: { type: Boolean, default: true },
    createdAt: { type: Number, default: +new Date() },
    createdBy: String,
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String,
  },
  {
    versionKey: false // remove field "__v"
  }
)

// ProductSchema.index({name: 'text', 'profile.something': 'text'});
ProductSchema.index({ name: 'text' })

module.exports = model('Product', ProductSchema)
