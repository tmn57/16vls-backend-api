const { Schema, model } = require('mongoose')

const ChatSchema = new Schema(
  {
    storeId: String,
    userId: String,
    content: String,
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    userDeletedId: String,
    createdAt: { type: Number, default: +new Date() },
    createdBy: String, //userID
    updatedAt: { type: Number, default: +new Date() },
    updatedBy: String,
  },
  {
    versionKey: false, // remove field "__v"
  }
);

module.exports = model('Chat', ChatSchema)
