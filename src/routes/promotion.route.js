const express = require('express')
const router = express.Router()
const Promotion = require('../models/promotion')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    let { code, saleOff, description, startDay, endDay } = req.body
    if (!code || !saleOff || !description || !startDay || !endDay) {
      return res.status(400).json({
        success: false,
        message: 'required fields: code, saleOff, description, startDay, endDay'
      })
    }
    const codeExisted = await Promotion.findOne({
      code: code.trim(),
      createdBy: userId
    })
    if (codeExisted) {
      return res.status(400).json({
        success: false,
        message: 'code already exists!'
      })
    }
    saleOff = (!saleOff || saleOff > 100) ? 0 : saleOff
    let newPromotion = Promotion({
      code,
      saleOff,
      description,
      startDay,
      endDay,
      createdBy: userId
    })
    await newPromotion.save()
    res.status(201).json({
      success: true,
      newPromotion
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.post('/update', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { code, content } = req.body
    let { saleOff, description, startDay, endDay, isEnabled } = content
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'required field: code'
      })
    }
    const promotion = await Promotion.findOne({
      code: code.trim(),
      createdBy: userId
    })
    if (!promotion) {
      return res.status(400).json({
        success: false,
        message: 'promotion not found!'
      })
    }
    saleOff = (!saleOff || saleOff > 100) ? 0 : saleOff
    if (saleOff) promotion.saleOff = saleOff
    if (description) promotion.description = description
    if (startDay) promotion.startDay = startDay
    if (endDay) promotion.endDay = endDay
    if (isEnabled) promotion.isEnabled = isEnabled
    promotion.updatedAt = +new Date()
    await promotion.save()
    res.status(201).json({
      success: true,
      promotion
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { code } = req.query
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'required field: code'
      })
    }
    const promotion = await Promotion.findOne({
      code: code.trim(),
      createdBy: userId
    })
    if (!promotion) {
      return res.status(400).json({
        success: false,
        message: 'promotion not found!'
      })
    }
    res.status(200).json({
      success: true,
      promotion
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

module.exports = router
