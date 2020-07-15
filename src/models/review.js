const { Schema, model } = require('mongoose')

const reviewSchema = new Schema(
    {
        userId: String,
        productId: String,
        point: { type: Number, default: 0 },
        content: { type: String, default: 'Không có bình luận' },
        time: { type: Number, default: Date.now() }
    },
    {
        versionKey: false,
    }
)

module.exports = model('Review', reviewSchema)
