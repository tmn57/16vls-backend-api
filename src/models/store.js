const { Schema, model } = require('mongoose')

const StoreSchema = new Schema(
  {
    _id: String,
    name: String,
    phone: String,
    email: String,
    ownerName: String,
    categories: [String],
    isActive: Boolean,
    address: String,
    profileLink: String,
    websiteLink: String,
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Number, default: +new Date() },
    avatar: String,
    description: String,
    createdBy: String, //userID
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Store', StoreSchema)
