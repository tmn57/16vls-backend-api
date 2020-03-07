const { Schema, model } = require('mongoose')

const UserSchema = new Schema({
  _id: String,
  username: String,
  lastname: String,
  firstname: String,
  password: String,
  email: String,
  address: String,
  phone: String,
  avatarUrl: String,
  isEnabled: Boolean,
  isShopOwner: Boolean,
  facebookId: String,
  updatedAt: Date,
  updatedBy: String,
  createdAt: Date,
  createdBy: String
})

module.exports = model('User', UserSchema)
