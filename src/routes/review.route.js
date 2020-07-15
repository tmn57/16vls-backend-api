const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const ProductModel = require('../models/product');
const UserModel = require('../models/user');
const ReviewModel = require('../models/review');
const { raiseError } = require('../utils/common')

const router = express.Router();

router.post('/', asyncHandler(async (req, res, next) => {
    const { productId } = req.body
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(raiseError(400, 'invalid product id'))
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
        return next(raiseError(400, 'Khong tim thay san pham'))
    }

    const reviews = await ReviewModel.find({ productId })

    let list = []

    await Promise.all(reviews.map(async r => {
        const user = await UserModel.findById(r.userId);
        if (user && user.isEnabled) {
            list.push({
                ...r.toObject(),
                userName: user.name
            })
        }
    }))

    return res.status(200).json({
        success: true,
        reviews: list
    })
}))

router.post('/review', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { reviewId, point, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
        return next(raiseError(400, 'review id is invalid'));
    }

    const review = await ReviewModel.findById(reviewId);

    if (!review || review.userId !== userId || ![1, 2, 3, 4, 5].includes(point)) {
        return next(raiseError(400, 'yeu cau danh gia khong hop le'));
    }

    review.point = point;
    review.markModified('point');
    if (content) {
        review.content = content;
        review.markModified('content');
    }
    await review.save();

    const reviews = await ReviewModel.find({ userId, productId: review.productId, point: { $gte: 0 } });
    if (reviews.length > 4) {
        const { productId } = review
        const product = ProductModel.findById(productId);
        if (product) {
            const sumPoints = reviews.reduce((total, r) => total + r.point, 0);
            product.reviewRate = sumPoints / reviews.length;
        }
    }

    return res.status(200).json({
        success: true,
        review
    })
}))

router.post('/check', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload;
    const { productId } = req.body;

    const review = await ReviewModel.findOne({ userId, productId, point: 0 }) //point 0 means pending; 0 < point < 6 means reviewed;

    if (!review) {
        return next(raiseError(400, 'Có thể bạn chưa mua hàng hoặc đã bình luận rồi'));
    }

    return res.status(200).json({
        success: true,
        reviewId: review._id.toString()
    })
}))

module.exports = router
