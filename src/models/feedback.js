const { Schema, model } = require('mongoose')

const FeedbackSchema = new Schema(
    {
        productId: String,
        userId: String,
        content: String,
        status: String,
        score: Number,
        createdAt: { type: Number, default: +new Date() },
        createdBy: String, //userID
        updatedAt: { type: Number, default: +new Date() },
        updatedBy: String
    },
    {
        versionKey: false // remove field "__v"
    }
)

module.exports = model('Feedback', FeedbackSchema)
