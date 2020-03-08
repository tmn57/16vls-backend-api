const { Schema, model } = require('mongoose')

const UserVerify = new Schema(
  {
    idUser: String,
    verifiedCode: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('UserVerify', UserVerify)
