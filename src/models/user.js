var mongoose = require('mongoose')

const Schema = mongoose.Schema

const User = new Schema({
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

module.exports = { User }