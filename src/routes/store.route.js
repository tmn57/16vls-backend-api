const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const { uuid } = require('uuidv4')
const Store = require('../models/store')
const { phoneNumberVerify } = require('../utils/common')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { name, phone } = req.body
    if (!phone || !name) {
      throw createError(400, 'phone and name are required!')
    } else {
      if (!phoneNumberVerify.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'invalid phone number!'
        })
      }
      const existedPhone = await Store.findOne({ phone })
      const existedName = await Store.findOne({ name })
      if (existedPhone || existedName) {
        return res.status(400).json({
          success: false,
          message: `${
            existedPhone
              ? 'phone number'
              : "store's name" 
          }` + ' is already existed!'
        })
      } else {
        let newStore = new Store({
          _id: uuid(),
          createdBy: userId,
          ...req.body
        })
        await newStore.save()
        return res.status(201).json({
          success: true,
          newStore
        })
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

module.exports = router
