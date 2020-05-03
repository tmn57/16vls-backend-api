const { Schema, model } = require('mongoose')

const UserSchema = new Schema(
  {
    type: { type: String, default: 'normal' },
    phone: String,
    name: String,
    password: String,
    email: { type: String, default: 'user@domain.com' },
    address: String,
    avatar: String,
    isEnabled: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    facebookId: String,
    updatedAt: { type: Number, default: +new Date() },
    createdAt: { type: Number, default: +new Date() }
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('User', UserSchema)
