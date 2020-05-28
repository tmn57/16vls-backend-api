const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Store = require('../models/store')
const { phoneNumberVerify, isAdmin } = require('../utils/common')

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

router.get('/', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const _id = req.query.id
    const storeFound = isAdmin(type)
      ? await Store.findById({ _id })
      : await Store.findOne({ _id, createdBy: userId })
    if (storeFound) {
      return res.status(200).json({
        success: true,
        store: storeFound
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'store not found!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.get('/all', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const storesFound = isAdmin(type)
      ? await Store.find({})
      : await Store.find({ createdBy: userId })
    if (storesFound && storesFound.length > 0) {
      return res.status(200).json({
        success: true,
        stores: storesFound
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'This user does not own any store!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.post('/getByConditions', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const { conditions } = req.body
    if (!conditions || Object.keys(conditions).length < 1) {
      return res.status(400).json({
        success: false,
        message: 'this route required 1 condition least'
      })
    }
    if (conditions.createdBy && !isAdmin(type)) delete conditions.createdBy
    const storesFound = isAdmin(type)
      ? await Store.find({ ...conditions })
      : await Store.find({ createdBy: userId, ...conditions })
    if (storesFound && storesFound.length > 0) {
      return res.status(200).json({
        success: true,
        stores: storesFound
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'there is no results for this conditions!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.post('/update', async (req, res, next) => {
  try {
    const { _id, content } = req.body
    if (Object.keys(req.body).length < 1) {
      return res.status(400).json({
        success: false,
        message: 'nothing to update'
      })
    }
    if (!_id || !content) {
      return res.status(400).json({
        success: false,
        message: '_id, content are required!'
      })
    }
    const {
      name,
      phone,
      email,
      ownerName,
      address,
      profileLink,
      websiteLink,
      description,
      avatar
    } = content
    const { userId } = req.tokenPayload
    const store = await Store.findOne({ _id, createdBy: userId })
    if (store) {
      if (name) store.name = name
      if (email) store.email = email
      if (ownerName) store.ownerName = ownerName
      if (profileLink) store.profileLink = profileLink
      if (websiteLink) store.websiteLink = websiteLink
      if (description) store.description = description
      if (address) store.address = address
      if (phone) store.phone = phone
      if (avatar) store.avatar = avatar
      store.updatedAt = +new Date()
      await store.save()
      return res.status(201).json({
        success: true,
        result: store
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'store not found in database!'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})

router.post('/categories/update', async (req, res, next) => {
  try {
    const { categories, storeName } = req.body
    if (!categories || !storeName) {
      throw createError(400, 'required field: categories, storeName')
    } else {
      const storeFound = await Store.findById({ name: storeName })
      if (!storeFound) {
        return res.status(400).json({
          success: false,
          message: 'store not found'
        })
      } else {
        storeFound.categories = [...categories]
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
