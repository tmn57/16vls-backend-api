const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { JWT_KEY } = require('../config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { phoneNumberVerify, raiseError } = require('../utils/common')
const { sendSmsOtpCode, checkSmsOtpCode } = require('../middlewares/twilio.sms')
const Store = require('../models/store')
const Cart = require('../models/cart')
const asyncHandler = require('express-async-handler')

router.post('/login', asyncHandler(async (req, res, next) => {
  const { phone, password } = req.body
  if (!phone || !password) return next(raiseError(400, 'Thiếu số điện thoại hoặc mật khẩu')) 

  const user = await User.findOne({ phone })

  if (!user) return next(raiseError(403, 'Tài khoản không tồn tại'))

  if (!user.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

  if (!user.isVerified) {
    return res.status(403).json({
      success: false,
      verifyRequired: true,
      message: `Bạn cần kích hoạt tài khoản thông qua SMS`
    })
  }

  const matched = bcrypt.compareSync(password, user.password)

  if (!matched) return next(raiseError(400, 'Sai mật khẩu'))

  const token = jwt.sign({ userId: user._id, type: user.type }, JWT_KEY)
  const store = await Store.findOne({ userId: user._id })

  return res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    token,
    result: {
      user: user.toObject(),
      store: store ? store.toObject() : null,
    },
  })
}))

router.post('/register', asyncHandler(async (req, res, next) => {
  const { phone, password, name, email } = req.body

  if (!phone || !password || !name) return next(raiseError(400, 'Required fields: phone, password, name'))

  if (!phoneNumberVerify.test(phone)) return next(raiseError(400, 'Số điện thoại không hợp lệ'))

  const userExisted = await User.findOne({ phone })

  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

    if (!userExisted.isVerified) {
      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Bạn cần kích hoạt tài khoản thông qua SMS`
      })
    }

    return next(raiseError(400, 'Số điện thoại đã được sử dụng'))
  }

  let newUser = new User({
    phone,
    name: name.trim(),
    email,
    storeFollowed: [],
    password: await bcrypt.hash(password, 10)
  })

  await newUser.save()

  let newCart = new Cart({
    ownerId: newUser._id.toString(),
    userId: newUser._id,
    products: [],
  })

  await newCart.save()

  return res.status(200).json({
    success: true,
    message: 'Tạo tài khoản thành công',
    type: 'normal',
    profile: newUser,
  })
}))

router.post('/getCode', asyncHandler(async (req, res, next) => {
  const { phone } = req.body
  if (!phoneNumberVerify.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không hợp lệ',
    })
  }

  const userExisted = await User.findOne({ phone })

  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

    const smsSent = await sendSmsOtpCode({ phone: userExisted.phone })
    return res.status(200).json(smsSent)
  }
  return next(raiseError(403, 'Số điện thoại chưa được đăng ký trong hệ thống'))
}))

router.post('/verify', asyncHandler(async (req, res, next) => {
  const { code, phone } = req.body

  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: số điện thoại, mã code',
    })
  }

  if (!phoneNumberVerify.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không hợp lệ',
    })
  }

  const userExisted = await User.findOne({ phone })
  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

    if (!userExisted.isVerified) {
      const verification = await checkSmsOtpCode({
        phone: userExisted.phone,
        code,
      })

      if (verification && verification.valid) {
        userExisted.isVerified = true
        await userExisted.save()
        return res.status(200).json({
          success: true,
          message: 'Xác thực thành công!',
        })
      }

      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Mã OTP bị sai hoặc đã hết hạn, vui lòng kích hoạt lại`
      })
    }

    return next(raiseError(403, `Tài khoản đã được kích hoạt, không cần kích hoạt lại!`))
  }

  return next(raiseError(403, `Số điện thoại này chưa đăng ký!`))
}))

// api reset password
router.post('/checkPhoneNumber', asyncHandler(async (req, res, next) => {
  const { phone } = req.body
  if (!phone) return next(raiseError(400, `phone number is required`))
  if (!phoneNumberVerify.test(phone)) return next(raiseError(400, `Số điện thoại không hợp lệ`))
  const userExisted = await User.findOne({ phone })
  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))
    if (!userExisted.isVerified) {
      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Bạn cần kích hoạt tài khoản thông qua SMS`
      })
    }
    return res.status(200).json({
      success: true,
    })
  }
  return next(raiseError(403, `Số điện thoại này chưa được đăng ký`));
}))

router.post('/resetPassword', asyncHandler(async (req, res, next) => {
  const { phone, passwordNew } = req.body
  if (!phone || !passwordNew) return next(raiseError(400, 'Phone number, passwordNew are required!'))

  if (!phoneNumberVerify.test(phone)) return next(raiseError(400, `Số điện thoại không hợp lệ`))

  const userExisted = await User.findOne({ phone })

  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

    if (!userExisted.isVerified) {
      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Bạn cần kích hoạt tài khoản thông qua SMS`
      })
    }
    
    userExisted.password = await bcrypt.hash(passwordNew, 10)
    userExisted.updatedAt = +new Date()
    userExisted.updatedBy = userExisted._id
    await userExisted.save()
    return res.status(200).json({
      success: true,
      message: 'Reset password successfully!',
    })

  }
  return next(raiseError(403, `Số điện thoại này chưa được đăng ký`));
}))


router.post('/verifyResetPassword', asyncHandler(async (req, res, next) => {
  const { code, phone } = req.body
  if (!phone || !code) return next(raiseError(400, 'phone, code are required!'))

  if (!phoneNumberVerify.test(phone)) return next(raiseError(400, 'số điện thoại không hợp lệ!'))

  const userExisted = await User.findOne({ phone })

  if (userExisted) {

    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))

    if (userExisted.isVerified) {
      const verification = await checkSmsOtpCode({
        phone: userExisted.phone,
        code,
      })
      if (verification && verification.valid) {
        return res.status(200).json({
          success: true,
          message: 'Xác thực thành công!',
        })
      }

      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Mã OTP bị sai hoặc đã hết hạn, vui lòng kích hoạt lại`
      })

    }

    return res.status(403).json({
      success: false,
      verifyRequired: true,
      message: `Bạn cần kích hoạt tài khoản thông qua SMS`
    })
  }

  return next(raiseError(403, `Tài khoản không tồn tại`))
}))

module.exports = router
