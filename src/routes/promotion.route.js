const express = require('express')
const router = express.Router()
const Promotion = require('../models/promotion')
const asyncHandler = require('express-async-handler')
const { isAuthenticated, storeOwnerRequired, isAdministrator } = require('../middlewares/auth')

router.post('/create', isAdministrator, asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  let { name, code, saleOff, startDate, endDate, description } = req.body
  if (!name || !code || !saleOff || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: name, code, saleOff, startDate, endDate'
    })
  }

  const sd = Date.parse(startDate);
  const ed = Date.parse(endDate);
  console.log(sd, ed)

  const codeExisted = await Promotion.findOne({ code: code.trim() })
  if (codeExisted) {
    return res.status(400).json({
      success: false,
      message: 'Code Promotion already exists!'
    })
  }
  saleOff = (saleOff < 0 || saleOff > 100) ? 0 : saleOff
  let newPromotion = Promotion({
    name,
    code,
    saleOff,
    description,
    startDate: sd,
    endDate: ed,
    createdBy: userId
  })
  await newPromotion.save()
  return res.status(200).json({
    success: true,
    result: newPromotion
  })
}))

router.post('/update', isAdministrator, asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const { promotionId, content } = req.body
  let { name, code, saleOff, startDate, endDate, description, isEnabled } = content

  if (!name || !code || !saleOff || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: name, code, saleOff, startDate, endDate'
    })
  }

  const sd = Date.parse(startDate);
  const ed = Date.parse(endDate);
  console.log(sd, ed)


  const promotion = await Promotion.findById({ _id: promotionId })
  if (!promotion) {
    return res.status(400).json({
      success: false,
      message: 'Promotion not found!'
    })
  }

  const codeExisted = await Promotion.findOne({ $and: [{ code: code.trim() }, { _id: { $ne: promotionId } }] })
  if (codeExisted) {
    return res.status(400).json({
      success: false,
      message: 'Code Promotion already exists!'
    })
  }

  saleOff = (saleOff < 0 || saleOff > 100) ? 0 : saleOff

  promotion.name = name;
  promotion.code = code;
  promotion.saleOff = saleOff
  promotion.description = description
  promotion.startDate = sd
  promotion.endDate = ed
  if (isEnabled) promotion.isEnabled = isEnabled
  promotion.updatedAt = +new Date()
  promotion.updatedBy = userId
  await promotion.save()

  return res.status(200).json({
    success: true,
    result: promotion
  })
}))

router.post('/register', asyncHandler(async (req, res, next) => {
  const { storeId, promotionId } = req.body
  if (!storeId || !promotionId) {
    return res.status(400).json({
      success: false,
      message: 'Required field: storeId, promotionId'
    })
  }

  const promotion = await Promotion.findById({ _id: promotionId })
  const now = +new Date();

  if (!promotion || (promotion.endDate < now)) {
    return res.status(400).json({
      success: false,
      message: 'Promotion not found!'
    })
  }

  const listStoresInPromotion = promotion.storesId
  if (listStoresInPromotion.indexOf(storeId) >= 0) {
    return res.status(400).json({
      success: false,
      message: 'Store has subscribed to this promotion!'
    })
  }
  else {
    listStoresInPromotion.push(storeId)
  }

  promotion.storesId = listStoresInPromotion;
  await promotion.save()

  return res.status(200).json({
    success: true,
    result: promotion
  })
}))

router.get('/', asyncHandler(async (req, res, next) => {
  const _id = req.query.id
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: 'Required field: id'
    })
  }
  const promotion = await Promotion.findById({ _id })
  const now = +new Date();
  if (promotion.endDate < now) {
    return res.status(200).json({
      success: false,
      message: "Promotion not found!"
    })
  }
  else {
    return res.status(200).json({
      success: true,
      result: promotion
    })
  }
}))

router.get('/all', asyncHandler(async (req, res, next) => {
  const now = +new Date();
  const promotions = await Promotion.find({ endDate: { $gte: now } })
  // const promotions = await Promotion.find({ $and: [{ startDate: { $lte: now } }, { endDate: { $gte: now } }] })
  return res.status(200).json({
    success: true,
    result: promotions
  })
}))

module.exports = router
