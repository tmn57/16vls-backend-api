const { Schema, model } = require('mongoose')
const randtoken = require('rand-token')

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
    refreshToken: {
      type: String,
      default: randtoken.generate(80)
    },
    isAdmin: {type: Boolean, default: false},
    statusCode: String,
    storeFollowed: [String],//listStoreId
    createdAt: { type: Number, default: +new Date() },
    createdBy: String,
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('User', UserSchema)
