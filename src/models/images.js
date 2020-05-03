const { Schema, model } = require('mongoose')

const ImageSchema = new Schema(
  {
    filename: String,
    originalname: String,
    size: Number,
    mimetype: String,
    destination: String,
    createdBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('Image', ImageSchema)
