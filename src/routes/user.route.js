const express = require('express')
const router = express.Router()
const User = require('../models/user')
const { PASSWORD_KEY, PHONE_CODE_KEY, JWT_KEY } = require('../config')
const jwt = require('jsonwebtoken')
const UserVerify = require('../models/verify')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const { uuid } = require('uuidv4')
const { phoneNumberVerify, getRandomCode } = require('../utils/common')
const sendSMSVerify = require('../utils/twilio.sms')

router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      return res.json({
        success: false,
        message: 'phone and password are required!',
      })
    } else {
      User.findOne({ phone }).then(async (user) => {
        if (user) {
          if (!user.isEnabled) {
            return res.status(403).json({
              success: false,
              message:
                'This account have been locked, please contact to administrator!',
            })
          } else {
            if (!user.isVerified) {
              return res.status(403).json({
                success: false,
                message: 'This account is not verified!',
              })
            }
            // Encrypt password
            // CryptoJS.AES.encrypt('0985002876', PASSWORD_KEY).toString()
            // Test case :(phone: 0985002876, password: U2FsdGVkX19quFiQBuy4OzKtEAg0TTNkt/zzmg/hgAs=)

            // Decrypt password
            let hash = CryptoJS.AES.decrypt(password, PASSWORD_KEY).toString(
              CryptoJS.enc.Utf8
            )
            const matched = await bcrypt.compare(hash, user.password)
            if (matched) {
              const token = jwt.sign({ userId: user._id }, JWT_KEY)
              return res.json({
                success: true,
                message: 'Login successfully!',
                token,
                user,
              })
            } else {
              return res.status(400).json({
                success: false,
                message: 'Password is incorrect!',
              })
            }
          }
        } else {
          return res.status(403).json({
            success: false,
            message: 'This account is not existed!',
          })
        }
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err,
    })
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const { phone, password, name } = req.body
    if (!phone || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'phone, password, name are required!',
      })
    }
    if (!phoneNumberVerify.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (!userExisted.isEnabled) {
          return res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!',
          })
        } else {
          if (!userExisted.isVerified) {
            return res.status(403).json({
              success: false,
              message:
                'This account was existed and have not been verified yet!',
            })
          } else {
            return res.status(403).json({
              success: false,
              message:
                'This phone number has already used, please type another number!',
            })
          }
        }
      } else {
        const newUser = new User()
        newUser._id = uuid()
        newUser.phone = phone
        newUser.name = name.trim()
        let decodedPassword = CryptoJS.AES.decrypt(
          password,
          PASSWORD_KEY
        ).toString(CryptoJS.enc.Utf8)
        newUser.password = await bcrypt.hash(decodedPassword, 10)
        newUser.save()

        return res.json({
          success: true,
          message: 'create account successfully!',
          profile: newUser,
        })
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString(),
    })
  }
})

router.post('/getCode', async (req, res, next) => {
  try {
    const { phone } = req.body
    if (!phoneNumberVerify.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (!userExisted.isEnabled) {
          return res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!',
          })
        } else {
          if (!userExisted.isVerified) {
            await UserVerify.updateMany(
              { phone, isUsed: false },
              {
                $set: { isUsed: true },
              }
            )
            const codeSent = getRandomCode()
            const newUserVerify = new UserVerify()
            newUserVerify._id = uuid()
            newUserVerify.phone = userExisted.phone
            newUserVerify.verifiedCode = await bcrypt.hash(codeSent, 10)
            newUserVerify.save()
            const smsSent = await sendSMSVerify(codeSent, userExisted.phone)
            return res.json(smsSent)
          } else {
            return res.status(403).json({
              success: false,
              message: 'This phone number has been verified!',
            })
          }
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'This phone number has not been registered before!',
        })
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString(),
    })
  }
})

router.post('/verify', async (req, res, next) => {
  try {
    const { code, phone } = req.body
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: 'phone, code are required!',
      })
    }
    if (!phoneNumberVerify.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      const userNeedVerified = await UserVerify.findOne({
        phone,
        isUsed: false,
      })
      if (userExisted && userNeedVerified) {
        if (!userExisted.isEnabled) {
          return res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!',
          })
        } else {
          if (!userExisted.isVerified) {
            const verifyCode = CryptoJS.AES.decrypt(
              code,
              PHONE_CODE_KEY
            ).toString(CryptoJS.enc.Utf8)
            const matched = await bcrypt.compare(
              verifyCode,
              userNeedVerified.verifiedCode
            )
            if (matched) {
              const result1 = await UserVerify.updateOne(
                { phone, isUsed: false },
                {
                  $set: { isUsed: true },
                }
              )
              const result2 = await User.updateOne(
                { phone },
                {
                  $set: { isVerified: true },
                }
              )
              if (result1 && result2) {
                return res.json({
                  success: true,
                  message: 'This phone number is verified!',
                })
              }
            } else {
              return res.status(400).json({
                success: false,
                message: 'This code is incorrect',
              })
            }
          } else {
            return res.status(403).json({
              success: false,
              message: 'This phone number has been verified!',
            })
          }
        }
      } else {
        if (!userNeedVerified) {
          return res.status(403).json({
            success: false,
            message:
              'There are no codes sent for this phone number before, please get code!',
          })
        } else {
          return res.status(403).json({
            success: false,
            message: 'This phone number has not been registered before!',
          })
        }
      }
    }
  } catch (error) {
    return res.status(500).json(error.toString)
  }
})

module.exports = router
