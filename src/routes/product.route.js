const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const { uuid } = require('uuidv4')
const Product = require('../models/product')
const { isAdmin } = require('../utils/common')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { name, images, categories, variants, storeId } = req.body
    if (!name || !images || !categories || !variants || !storeId) {
      throw createError(
        400,
        'required field: name, images, categories, variants, storeId'
      )
    } else {
      const existedName = await Product.findOne({ name })
      if (existedName) {
        return res.status(400).json({
          success: false,
          message: "product's name is already existed!"
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

router.get('/', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const _id = req.query.id
    const products = isAdmin(type)
      ? await Product.findOne({ _id })
      : await Product.findOne({ _id, createdBy: userId })
    if (products) {
      return res.status(200).json({
        success: true,
        products
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'product not found!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.get('/allByStore', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const storeId = req.query.id
    const products = isAdmin(type)
      ? await Product.find({ storeId })
      : await Product.find({ storeId, createdBy: userId })
    if (products && products.length > 0) {
      return res.status(200).json({
        success: true,
        products
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'product not found!'
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
    const products = isAdmin(type)
      ? await Product.find({ ...conditions })
      : await Product.find({ createdBy: userId, ...conditions })
    if (products && products.length > 0) {
      return res.status(200).json({
        success: true,
        products
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
      variants,
      storeId,
      description,
      tags,
      categories,
      images
    } = content
    const { userId } = req.tokenPayload
    const product = await Product.findOne({ _id, createdBy: userId })
    if (product) {
      if (name) product.name = name
      if (storeId) product.storeId = storeId
      if (description) product.description = description
      if (images) product.images = images
      if (variants) product.variants = variants
      if (tags) product.tags = tags
      if (categories) product.categories = categories
      product.updatedAt = +new Date()
      await product.save()
      return res.status(201).json({
        success: true,
        result: product
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'product not found in database!'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})

module.exports = router
