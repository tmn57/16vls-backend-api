const express = require('express')
const router = express.Router()
const User = require('../models/user')
const UserVerify = require('../models/verify')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const { uuid } = require('uuidv4')
const { phoneNumberVerify, getRandomCode } = require('../utils/common')
const sendSMSVerify = require('../utils/twilio.sms')
const { PHONE_CODE_KEY } = require('../config')

router.post('/getCode', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { phone } = req.body
    if (!phoneNumberVerify.test(phone)) {
      return res.json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (userId !== userExisted._id) {
          return res.status(401).json({
            success: false,
            message: 'You do not have permission getting code, please log-in by this phone!'
          })
        }
        if (!userExisted.isEnabled) {
          return res.json({
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
            return res.status(200).json(smsSent)
          } else {
            return res.json({
              success: false,
              message: 'This phone number has been verified!',
            })
          }
        }
      } else {
        return res.json({
          success: false,
          message: 'This phone number has not been registered before!',
        })
      }
    }
  } catch (error) {
    return res.json({
      success: false,
      message: error.toString(),
    })
  }
})

router.post('/verify', async (req, res, next) => {
  try {
    console.log(CryptoJS.AES.encrypt('056560', PHONE_CODE_KEY).toString())
    const { userId } = req.tokenPayload
    const { code, phone } = req.body
    if (!phone || !code) {
      return res.json({
        success: false,
        message: 'phone, password are required!',
      })
    }
    if (!phoneNumberVerify.test(phone)) {
      return res.json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userId !== userExisted._id) {
        return res.status(401).json({
          success: false,
          message: 'You do not have permission verifing, please log-in by this phone!'
        })
      }
      const userNeedVerified = await UserVerify.findOne({
        phone,
        isUsed: false,
      })
      if (userExisted && userNeedVerified) {
        if (!userExisted.isEnabled) {
          return res.json({
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
                return res.status(200).json({
                  success: true,
                  message: 'This phone number is verified!',
                })
              }
            } else {
              return res.json({
                success: false,
                message: 'This code is incorrect',
              })
            }
          } else {
            return res.json({
              success: false,
              message: 'This phone number has been verified!',
            })
          }
        }
        } else {
        return res.json({
          success: false,
          message: 'This phone number has not been registered before!',
        })
      }
    }
  } catch (error) {
    return res.json(error)
  }
})

module.exports = router
