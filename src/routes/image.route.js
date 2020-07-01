const express = require('express')
const router = express.Router()
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
            message: 'Chưa có file nào được chọn'
          })
        } else {
          req.files.forEach(async (item) => {
            let newImage = new Image({
              ...item,
              createdBy: userId
            })
            await newImage.save()
          })
          res.status(201).json({
            success: true,
            file: req.files.map((item) => 'images/'.concat(item.filename))
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
        message: 'Người dùng này chưa có hình ảnh nào'
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
