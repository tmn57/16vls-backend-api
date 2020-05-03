const { Schema, model } = require('mongoose')

const PromotionSchema = new Schema(
  {
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
    startDay: {
      type: Number,
      default: +new Date()
    },
    endDay: {
      type: Number,
      default: +new Date()
    },
    isEnabled: {
      type: Boolean,
      default: true
    },
    createdBy: String,
    updatedAt: {
      type: Number,
      default: +new Date()
    }
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Promotion', PromotionSchema)
