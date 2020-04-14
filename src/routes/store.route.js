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
      const existedName = await Store.findOne({ name })
      if (existedName) {
        return res.status(400).json({
          success: false,
          message: "store's name is already existed!"
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
          message: 'Wait for approval!',
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

router.post('/categories/add', async (req, res, next) => {
  try {
    const { categories, storeId } = req.body
    if (!categories || !storeId) {
      throw createError(400, 'required field: categories, storeId')
    } else {
      const storeFound = await Store.findOne({ _id: storeId })
      if (!storeFound) {
        return res.status(400).json({
          success: false,
          message: 'store not found'
        })
      } else {
        if (storeFound.categories.length < 1) {
          storeFound.categories = [...categories]
        } else {
          let insert = Array.from(new Set([
            ...storeFound.categories,
            ...new Set(categories)
          ]))
          storeFound.categories = [...insert]
        }
        await storeFound.save()
        return res.status(201).json({
          success: true,
          storeFound
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

router.post('/categories/delete', async (req, res, next) => {
  try {
    const { categories, storeId } = req.body
    if (!categories || !storeId) {
      throw createError(400, 'required field: categories, storeId')
    } else {
      const storeFound = await Store.findOne({ _id: storeId })
      if (!storeFound) {
        return res.status(400).json({
          success: false,
          message: 'store not found'
        })
      } else {
        if (storeFound.categories.length < 1) {
          return res.status(400).json({
            success: false,
            message: 'nothing to delete!'
          })
        }
        let remain = storeFound.categories.filter(x => !categories.includes(x))
        storeFound.categories = [...remain]
        await storeFound.save()
        return res.status(201).json({
          success: true,
          storeFound
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
