const { Schema, model } = require('mongoose')

const reviewSchema = new Schema(
    {
        userId: String,
        objectId: String,
        objectType: String, //'user', 'product', 'store', 'review', 'stream'
        description: { type: String, default: 'Không có mô tả' },
        status: { type: String, default: 'pending' }, //'pending'; 'done'
        adminId: { type: String, default: '' },
        response: { type: String, default: 'khong co noi dung' }
    },
    {
        timestamps: true,
        versionKey: false,
    }
)

module.exports = model('Review', reviewSchema)
