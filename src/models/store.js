const { Schema, model } = require('mongoose')

const StoreSchema = new Schema(
  {
    name: String,
    phone: String,
    email: String,
    ownerName: String,
    ownerId: String,
    userId: String,
    categories: [String],
    discounts: [String],
    isActive: Boolean,
    address: String,
    profileLink: String,
    websiteLink: {type: String, default: ''},
    isApproved: { type: Boolean, default: false },
    avatar: {type: String, default: ''},
    description: {type: String, default: ''},
    statusCode: String,
    followers: [String], // listUserId
    createdAt: { type: Number, default: +new Date() },
    createdBy: String, //userID
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Store', StoreSchema)
