const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const { uuid } = require('uuidv4')
const { phoneNumberVerify } = require('../utils/common')
const { PASSWORD_KEY, JWT_KEY } = require('../config')
const jwt = require('jsonwebtoken')

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
            return res.json({
              success: false,
              message:
                'This account have been locked, please contact to administrator!',
            })
          } else {
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
              return res.status(200).json({
                success: true,
                message: 'Login successfully!',
                token,
                user,
              })
            } else {
              return res.json({
                success: false,
                message: 'Password is incorrect!',
              })
            }
          }
        } else {
          return res.json({
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
      return res.json({
        success: false,
        message: 'phone, password, name are required!',
      })
    }
    if (!phoneNumberVerify.test(phone)) {
      return res.json({
        success: false,
        message: 'invalid phone number!',
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (!userExisted.isEnabled) {
          return res.json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!',
          })
        } else {
          if (!userExisted.isVerified) {
            return res.json({
              success: false,
              message:
                'This account was existed and have not been verified yet!',
            })
          } else {
            return res.json({
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

        return res.status(200).json({
          success: true,
          message: 'create account successfully!',
          profile: newUser,
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

module.exports = router
