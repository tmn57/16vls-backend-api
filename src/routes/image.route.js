const express = require('express')
const router = express.Router()
const { uuid } = require('uuidv4')
const Image = require('../models/images')
const { upload } = require('../services/upload')
const path = require('path')

router.post('/upload', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err
        })
      } else {
        if (!Array.isArray(req.files)) {
          return res.status(400).json({
            success: false,
            message: 'Error: No Files Selected!'
          })
        } else {
          req.files.forEach(async (item) => {
            let newImage = new Image({
              _id: uuid(),
              ...item,
              createdBy: userId
            })
            await newImage.save()
          })
          res.status(201).json({
            success: true,
            file: req.files.map((item) => 'uploads/'.concat(item.filename))
          })
        }
      }
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const { userId } = req.tokenPayload
    const _id = req.query.id
    if (_id && _id.includes('.')) {
      return res.status(403).json({
        success: false,
        message: 'Preventing Directory Traversal!'
      })
    }
    const image = await Image.findOne({ _id, createdBy: userId })
    if (image) {
      res.set('Content-Type', image.mimetype)
      return await new Promise((resolve, reject) => {
        if (resolve) {
          res.sendFile(path.resolve(`./src/public/images/${image.filename}`))
        } else {
          res.status(403).json({
            success: false,
            message: rej.toString()
          })
        }
      })
    } else {
      return res.status(403).json({
        success: false,
        message: 'image not found!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.get('/allByUser', async (req, res) => {
  try {
    const { userId } = req.tokenPayload
    const images = await Image.find({ createdBy: userId })
    if (images && images.length > 0) {
      return res.status(200).json({
        success: true,
        images
      })
    } else {
      return res.status(403).json({
        success: false,
        message: 'this user does not own any images!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

module.exports = router
