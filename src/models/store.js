const { Schema, model } = require('mongoose')

const StoreSchema = new Schema(
  {
    _id: String,
    name: String,
    owner: String,
    isActive: Boolean,
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Number, default: +new Date() },
    avatar: String,
    description: String
    
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Store', StoreSchema)
