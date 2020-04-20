const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const { PASSWORD_KEY } = require('../config')

router.post('/update', async (req, res, next) => {
  try {
    if (Object.keys(req.body).length < 1) {
      return res.status(400).json({
        success: false,
        message: 'nothing to update'
      })
    }
    const { name, email, address, avatar } = req.body
    const { userId } = req.tokenPayload
    const user = await User.findOne({ _id: userId })
    if (user) {
      if (name) user.name = name
      if (email) user.email = email
      if (address) user.address = address
      if (avatar) user.avatar = avatar
      user.updatedAt = +new Date()
      await user.save()
      return res.status(201).json({
        success: true,
        result: user
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'user not found in database!'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})

router.post('/changePass', async (req, res, next) => {
  try {
    const { newPassword } = req.body
    const { userId } = req.tokenPayload
    const user = await User.findOne({ _id: userId })
    if (user) {
      let decodedPassword = CryptoJS.AES.decrypt(newPassword, PASSWORD_KEY).toString(
        CryptoJS.enc.Utf8
      )
      user.password = await bcrypt.hash(decodedPassword, 10)
      await user.save()
      return res.status(201).json({
        success: true,
        message: 'change password successfully!'
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'user not found in database!'
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
