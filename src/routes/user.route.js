const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const { PASSWORD_KEY } = require('../config')
const randtoken = require('rand-token')
const Store = require('../models/store')
const asyncHandler = require('express-async-handler')

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
    const user = await User.findById(userId, {
      refreshToken: false
    })
    if (user) {
      if (name) user.name = name
      if (email) user.email = email
      if (address) user.address = address
      if (avatar) user.avatar = avatar
      user.updatedAt = +new Date()
      await user.save()
      return res.status(201).json({
        success: true,
        user
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
    const user = await User.findById(userId, {
      refreshToken: false
    })
    if (user) {
      let decodedPassword = CryptoJS.AES.decrypt(
        newPassword,
        PASSWORD_KEY
      ).toString(CryptoJS.enc.Utf8)
      user.password = await bcrypt.hash(decodedPassword, 10)
      user.refreshToken = randtoken.generate(80)
      await user.save()
      return res.status(201).json({
        success: true,
        message: 'password has been changed successfully!'
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

router.get('/info', async (req, res) => {
  try {
    const { userId } = req.tokenPayload
    let user = await User.findById(userId, {
      refreshToken: false
    })

    const store = await Store.findOne({ userId: user._id })

    if (user) {
      return res.status(200).json({
        success: true,
        result: {
          user,
          store: store || false
        }
      })
    } else {
      res.status(403).json({
        success: false,
        message: 'user not found!'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})


router.post('/updateAddress', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload

  const { street, ward, district, city } = req.body
  if (Object.keys(req.body).length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Bothing to update'
    })
  }

  const user = await User.findById({ _id: userId })
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'User not found in database!'
    })
  }

  let obj = {
    street: street,
    ward: ward,
    district: district,
    city: city
  }

  user.address = obj
  user.updatedBy = userId
  await user.save()

  return res.status(200).json({
    success: true,
    result: user
  })

}))


router.post('/updateShippingAddress', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload

  const { street, ward, district, city } = req.body
  if (Object.keys(req.body).length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Bothing to update'
    })
  }

  const user = await User.findById({ _id: userId })
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'User not found in database!'
    })
  }

  let obj = {
    street: street,
    ward: ward,
    district: district,
    city: city
  }

  user.shippingAddress = obj
  user.updatedBy = userId
  await user.save()

  return res.status(200).json({
    success: true,
    result: user
  })

}))

module.exports = router
