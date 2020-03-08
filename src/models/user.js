const { Schema, model } = require('mongoose')

const UserSchema = new Schema(
  {
    _id: String,
    phone: String,
    lastname: String,
    firstname: String,
    password: String,
    email: { type: String, default: 'user@domain.com' },
    address: String,
    avatarUrl: String,
    isEnabled: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isShopOwner: { type: Boolean, default: false },
    facebookId: String,
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String,
    createdAt: { type: Number, default: +new Date() },
    createdBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('User', UserSchema)
