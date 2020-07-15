const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const ReportModel = require('../models/report');

const { raiseError } = require('../utils/common')

const router = express.Router();

router.post('/report', asyncHandler(async (req, res, next) => {
    const { userId } = req.tokenPayload
    const { objectId, objectType, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(objectId)) {
        return next(raiseError(400, `Invalid objectId`))
    }

    if (!['user', 'store', 'stream', 'product', 'review'].includes(objectType)) {
        return next(raiseError(400, `Invalid objectType`))
    }

    const existedReport = await ReportModel.findOne({
        userId,
        objectId,
        objectType
    })

    if (existedReport) {
        return next(raiseError(400, `Bạn đã báo cáo vi phạm ${objectType} này rồi`))
    }

    const newReport = new ReportModel({
        userId,
        objectId,
        objectType,
        description
    })

    await newReport.save();

    return res.status(200).json({
        success: true,
        report: newReport.toObject()
    })
}))


module.exports = router
