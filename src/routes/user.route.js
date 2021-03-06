const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const { PASSWORD_KEY } = require('../config')
const randtoken = require('rand-token')
const Store = require('../models/store')
const asyncHandler = require('express-async-handler')

router.post('/update', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  if (Object.keys(req.body).length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Không có gì để cập nhập'
    })
  }
  const { name, email, address, avatar, shippingAddress } = req.body
  const user = await User.findById(userId, {
    refreshToken: false
  })

  if (user) {
    if (name) user.name = name
    if (email) user.email = email
    if (address) user.address = address
    if (shippingAddress) user.shippingAddress = shippingAddress
    if (avatar) user.avatar = avatar
    user.updatedAt = +new Date()
    user.updatedBy = userId
    await user.save()
    return res.status(201).json({
      success: true,
      result: user
    })
  } else {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy người dùng trong database'
    })
  }
}))

router.post('/changePassword', asyncHandler(async (req, res, next) => {
  const { newPassword, curPassword } = req.body
  const { userId } = req.tokenPayload
  const user = await User.findById(userId, {
    refreshToken: false
  })
  if (user) {
    //let decodedCurPassword = CryptoJS.AES.decrypt(curPassword, PASSWORD_KEY).toString(CryptoJS.enc.Utf8)
    const matched = await bcrypt.compare(curPassword, user.password)
    if (!matched) {
      return res.status(400).json({
        success: false,
        message: 'Sai mật khẩu cũ',
      })
    }

    //let decodedPassword = CryptoJS.AES.decrypt(newPassword, PASSWORD_KEY).toString(CryptoJS.enc.Utf8)
    user.password = await bcrypt.hash(newPassword, 10)
    user.refreshToken = randtoken.generate(80)
    user.updatedBy = userId
    user.updatedAt = +new Date()
    await user.save()
    return res.status(201).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công'
    })
  }
  else {
    return res.status(401).json({
      success: false,
      message: 'Không tìm thấy người dùng trong database'
    })
  }

}))

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
        message: 'Không tìm thấy người dùng'
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
      message: 'Không có gì để cập nhật'
    })
  }

  const user = await User.findById(userId)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy người dùng trong database'
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
  user.updatedAt = +new Date()
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
      message: 'Không có gì để cập nhật'
    })
  }

  const user = await User.findById(userId)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy người dùng trong database'
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
  user.updatedAt = +new Date()
  await user.save()

  return res.status(200).json({
    success: true,
    result: user
  })

}))

module.exports = router
