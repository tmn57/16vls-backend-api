const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { PASSWORD_KEY, JWT_KEY } = require('../config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { phoneNumberVerify, getRandomCode, raiseError } = require('../utils/common')
const { sendSmsOtpCode, checkSmsOtpCode } = require('../middlewares/twilio.sms')
const Store = require('../models/store')
const { isAuthenticated } = require('../middlewares/auth')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('./public/common/sysCategory.json')
const SYS_CATEGORY = low(adapter)
const Cart = require('../models/cart')
const asyncHandler = require('express-async-handler')

router.post('/login', asyncHandler(async (req, res, next) => {
  const { phone, password } = req.body
  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu số điện thoại hoặc mật khẩu',
    })
  }

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

  // Encrypt password
  // CryptoJS.AES.encrypt('0985002876', PASSWORD_KEY).toString()
  // Test case :(phone: 0985002876, password: U2FsdGVkX19quFiQBuy4OzKtEAg0TTNkt/zzmg/hgAs=)

  // Decrypt password
  // let hash = CryptoJS.AES.decrypt(password, PASSWORD_KEY).toString(
  //   CryptoJS.enc.Utf8
  // )
  // console.log(hash)

  const matched = bcrypt.compareSync(password, user.password)

  if (!matched) {
    return res.status(400).json({
      success: false,
      message: 'Sai mật khẩu',
    })
  }

  const token = jwt.sign({ userId: user._id, type: user.type }, JWT_KEY)
  const store = await Store.findOne({ userId: user._id })

  return res.status(200).json({
    success: true,
    message: 'Đăng nhập thành công',
    token,
    result: {
      user: user.toObject(),
      store: store.toObject() || null,
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

    if (!user.isVerified) {
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
  // newUser.phone = phone
  // newUser.name = name.trim()
  // newUser.email = email
  // newUser.storeFollowed = []
  // let decodedPassword = CryptoJS.AES.decrypt(
  //   password,
  //   PASSWORD_KEY
  // ).toString(CryptoJS.enc.Utf8)

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
        message: `Mã SMS đã hết hạn, vui lòng kích hoạt lại`
      })
    }

    return next(raiseError(403, `Tài khoản đã được kích hoạt, không cần kích hoạt lại!`))
  }

  return next(raiseError(403, `Số điện thoại này chưa đăng ký!`))
}))

// router.post('/checkCode', async (req, res, next) => {
//   try {
//     const { code, phone } = req.body
//     if (!phone || !code) {
//       return res.status(400).json({
//         success: false,
//         message: 'phone, code are required!',
//       })
//     }
//     if (!phoneNumberVerify.test(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: 'invalid phone number!',
//       })
//     } else {
//       const userFound = await User.findOne({
//         phone,
//         isEnabled: true,
//       })
//       if (userFound) {
//         const verification = await checkSmsOtpCode({
//           phone: userFound.phone,
//           code,
//         })
//         if (verification && verification.valid) {
//           const token = jwt.sign(
//             { userId: userFound._id, type: userFound.type },
//             JWT_KEY,
//             {
//               expiresIn: 5,
//             }
//           )
//           return res.json({
//             success: true,
//             message: 'This token is available in 5 minutes!',
//             token,
//           })
//         } else {
//           return res.status(400).json({
//             success: false,
//             message: 'This code is incorrect or expired!',
//           })
//         }
//       } else {
//         return res.status(403).json({
//           success: false,
//           message: 'This phone number has not been registered before!',
//         })
//       }
//     }
//   } catch (error) {
//     return res.status(500).json(error.toString())
//   }
// })

// router.post('/refreshToken', async (req, res) => {
//   try {
//     const { accessToken, refreshToken } = req.body
//     if (!accessToken || !refreshToken) {
//       return res.status(400).json({
//         success: false,
//         message: 'accessToken, refreshToken are required!',
//       })
//     }
//     jwt.verify(
//       accessToken,
//       JWT_KEY,
//       {
//         ignoreExpiration: true,
//       },
//       async (err, payload) => {
//         if (err) {
//           return res.status(400).json({
//             success: false,
//             message: err,
//           })
//         }
//         const { userId } = payload
//         const user = await User.findById(userId)
//         if (!user || !user.isEnabled) {
//           return res.status(400).json({
//             success: false,
//             message: 'this account not found or was blocked!',
//           })
//         }
//         if (user.refreshToken !== refreshToken) {
//           return res.status(400).json({
//             success: false,
//             message: 'refreshToken is incorrect!',
//           })
//         }
//         const newAccessToken = jwt.sign(
//           { userId: user._id, type: user.type },
//           JWT_KEY,
//           {
//             expiresIn: '24h',
//           }
//         )
//         return res.json({
//           success: true,
//           newAccessToken,
//         })
//       }
//     )
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.toString(),
//     })
//   }
// })

router.get('/sysCategories', isAuthenticated, asyncHandler(async (req, res) => {
  const data = SYS_CATEGORY.get('sysCategories').value()
  return res.status(200).json({
    success: true,
    sysCategories: data || [],
  })
}))

router.get('/sysCategories/restore', isAuthenticated, asyncHandler(async (req, res) => {

  if (req.tokenPayload.type !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'only administrator can access this api!',
    })
  }
  const original = SYS_CATEGORY.get('originalSysCategories').value()
  SYS_CATEGORY.set('sysCategories', [...original]).write()
  return res.status(200).json({
    success: true,
    sysCategories: original || [],
  })
}))

router.post('/sysCategories/replace', isAuthenticated, async (req, res) => {
  try {
    if (req.tokenPayload.type !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'only administrator can access this api!',
      })
    }
    const { sysCategories } = req.body
    if (sysCategories && sysCategories.length > 0) {
      SYS_CATEGORY.set('sysCategories', [...sysCategories]).write()
      const data = SYS_CATEGORY.get('sysCategories').value()
      return res.json({
        success: true,
        sysCategories: data || [],
      })
    } else {
      return res.json({
        success: true,
        message: 'sysCategories is required!',
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.toString(),
    })
  }
})

// api reset password
router.post('/checkPhoneNumber', asyncHandler(async (req, res, next) => {
  const { phone } = req.body
  if (!phone) return next(raiseError(400, `phone number is required`))
  if (!phoneNumberVerify.test(phone)) return next(raiseError(400, `Số điện thoại không hợp lệ`))
  const userExisted = await User.findOne({ phone })
  if (userExisted) {
    if (!userExisted.isEnabled) return next(raiseError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ với admin'))
    if (!user.isVerified) {
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

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        verifyRequired: true,
        message: `Bạn cần kích hoạt tài khoản thông qua SMS`
      })
    }

    let decodedPassword = CryptoJS.AES.decrypt(passwordNew, PASSWORD_KEY).toString(CryptoJS.enc.Utf8)
    userExisted.password = await bcrypt.hash(decodedPassword, 10)
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
        message: `Mã SMS đã hết hạn, vui lòng kích hoạt lại`
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
