const { Schema, model } = require('mongoose')

const CategorySystemSchema = new Schema(
  {
    name: String,
    description: {type: String, default: ''},
    typeSize: {type: String, default: 'ALL'}, // NUMBER, STRING, ALL
    createdAt: { type: Number, default: +new Date() },
    createdBy: String,
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String
  },
  {
    versionKey: false // remove field "__v"
  }
)

module.exports = model('CategorySystem', CategorySystemSchema)
