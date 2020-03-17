const { Schema, model } = require('mongoose')

const UserVerify = new Schema(
  {
    _id: String,
    phone: String,
    verifiedCode: String,
    isUsed: { type: Boolean, default: false }
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('UserVerify', UserVerify)
