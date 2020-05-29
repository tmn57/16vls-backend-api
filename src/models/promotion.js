const { Schema, model } = require('mongoose')

const PromotionSchema = new Schema(
  {
    storesId: [String],
    name: String,
    code: {
      type: String,
      default: 'Promotion',
      trim: true
    }, // no-duplicate
    saleOff: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    description: String,
    startDate: {
      type: Number,
      default: +new Date()
    },
    endDate: {
      type: Number,
      default: +new Date()
    },
    isEnabled: {
      type: Boolean,
      default: true
    },
    statusCode: String,
    createdAt: { type: Number, default: +new Date() },
    createdBy: String, //userID
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Promotion', PromotionSchema)
