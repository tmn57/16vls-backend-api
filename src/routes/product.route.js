const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const { uuid } = require('uuidv4')
const Product = require('../models/product')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { name, images, categories, variants, storeId } = req.body
    if (!name || !images || !categories || !variants || !storeId) {
      throw createError(400, 'required field: name, images, categories, variants, storeId')
    } else {
      const existedName = await Product.findOne({ name })
      if (existedName) {
        return res.status(400).json({
          success: false,
          message: 'product\'s name is already existed!'
        })
      } else {
        let newProduct = new Product({
          _id: uuid(),
          createdBy: userId,
          storeId,
          ...req.body
        })
        await newProduct.save()
        return res.status(201).json({
          success: true,
          newProduct
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
