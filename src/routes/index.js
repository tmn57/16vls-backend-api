const express = require('express')
const router = express.Router()
const User = require('../models/user')
const UserVerify = require('../models/verify')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const isAuthenticated = require('../utils/auth')
const { uuid } = require('uuidv4')
const { phoneNumberVerify, getRandomCode } = require('../utils/common')
const sendSMSVerify = require('../utils/twilio.sms')

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).send('16vls web API')
})

// Route need Authenticate
router.post('/login', async (req, res, next) => {
  try {
    const auth = await isAuthenticated(req)
    if (auth.statusCheck) {
      res.status(200).json({
        success: true,
        message: auth.message,
        userByToken: auth.userByToken
      })
    } else {
      const { phone, password } = req.body
      if (!phone || !password) {
        res.status(403).json({
          success: false,
          message: 'phone and password are required!'
        })
      } else {
        User.findOne({ phone }).then(async user => {
          if (user) {
            if (!user.isEnabled) {
              res.status(403).json({
                success: false,
                message:
                  'This account have been locked, please contact to administrator!'
              })
            } else {
              if (!user.isVerified) {
                res.status(403).json({
                  success: false,
                  message: 'This account have not been verified yet!'
                })
              } else {
                // Encrypt password
                // CryptoJS.AES.encrypt('0985002876', '16vls-secret').toString()
                // Test case :(phone: 0985002876, password: U2FsdGVkX19quFiQBuy4OzKtEAg0TTNkt/zzmg/hgAs=)

                // Decrypt password
                let hash = CryptoJS.AES.decrypt(
                  password,
                  '16vls-secret'
                ).toString(CryptoJS.enc.Utf8)
                const matched = await bcrypt.compare(hash, user.password)
                if (matched) {
                  const token = jwt.sign({ userId: user._id }, '16vls-secret')
                  res.status(200).json({
                    success: true,
                    message: 'Login successfully!',
                    token,
                    user
                  })
                } else {
                  res.status(403).json({
                    success: false,
                    message: 'Password is incorrect!'
                  })
                }
              }
            }
          } else {
            res.status(403).json({
              success: false,
              message: 'This account is not existed!'
            })
          }
        })
      }
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err
    })
  }
})

// Route is not Authenticate
router.post('/register', async (req, res, next) => {
  try {
    const { phone, password, firstname, lastname } = req.body
    if (!phoneNumberVerify.test(phone)) {
      res.status(403).json({
        success: false,
        message: 'invalid phone number!'
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (!userExisted.isEnabled) {
          res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!'
          })
        } else {
          if (!userExisted.isVerified) {
            res.status(403).json({
              success: false,
              message:
                'This account was existed and have not been verified yet!'
            })
          } else {
            res.status(403).json({
              success: false,
              message:
                'This phone number has already used, please type another number!'
            })
          }
        }
      } else {
        const newUser = new User()
        newUser._id = uuid()
        newUser.phone = phone
        newUser.firstname = firstname.trim()
        newUser.lastname = lastname.trim()
        let hashedPassword = CryptoJS.AES.decrypt(
          password,
          '16vls-secret'
        ).toString(CryptoJS.enc.Utf8)
        newUser.password = await bcrypt.hash(hashedPassword, 10)
        newUser.save()

        res.status(200).json({
          success: true,
          message: 'create account successfully!',
          profile: newUser
        })
      }
    }
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error
    })
  }
})

router.post('/getCodeVerify', async (req, res, next) => {
  try {
    const { phone } = req.body
    if (!phoneNumberVerify.test(phone)) {
      res.status(403).json({
        success: false,
        message: 'invalid phone number!'
      })
    } else {
      const userExisted = await User.findOne({ phone })
      if (userExisted) {
        if (!userExisted.isEnabled) {
          res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!'
          })
        } else {
          if (!userExisted.isVerified) {
            await UserVerify.updateMany(
              { phone, isUsed: false },
              {
                $set: { isUsed: true } 
              }
            )
            const codeSent = getRandomCode()
            const newUserVerify = new UserVerify()
            newUserVerify._id = uuid()
            newUserVerify.phone = userExisted.phone
            newUserVerify.verifiedCode = await bcrypt.hash(codeSent, 10)
            newUserVerify.save()
            const smsSent = await sendSMSVerify(codeSent, userExisted.phone)
            res.status(200).json(smsSent)
          } else {
            res.status(403).json({
              success: false,
              message: 'This phone number has been verified!'
            })
          }
        }
      } else {
        res.status(403).json({
          success: false,
          message: 'This phone number has not been registered before!'
        })
      }
    }
  } catch (error) {
    res.status(403).json({
      success: false,
      message: error.toString()
    })
  }
})

router.post('/verifyAccount', async (req, res, next) => {
  try {
    const { code, phone } = req.body
    if (!phoneNumberVerify.test(phone)) {
      res.status(403).json({
        success: false,
        message: 'invalid phone number!'
      })
    } else {
      const userExisted = await User.findOne({ phone })
      const userNeedVerified = await UserVerify.findOne({ phone, isUsed: false })
      if (userExisted && userNeedVerified) {
        if (!userExisted.isEnabled) {
          res.status(403).json({
            success: false,
            message:
              'This account was existed and have been locked, please contact to administrator!'
          })
        } else {
          if (!userExisted.isVerified) {
            // console.log(CryptoJS.AES.encrypt('054262', '16vls-secret').toString())
            const verifyCode = CryptoJS.AES.decrypt(
              code,
              '16vls-secret'
            ).toString(CryptoJS.enc.Utf8)
            const matched = await bcrypt.compare(verifyCode, userNeedVerified.verifiedCode)
            if (matched) {
              const result1 = await UserVerify.updateOne(
                { phone, isUsed: false },
                {
                  $set: { isUsed: true }
                }
              )
              const result2 = await User.updateOne(
                { phone },
                {
                  $set: { isVerified: true }
                }
              )
              if (result1 && result2) {
                res.status(200).json({
                  success: true,
                  message: 'This phone number is verified!'
                })
              }
            } else {
              res.status(403).json({
                success: false,
                message: 'This code is incorrect'
              })
            }
          } else {
            res.status(403).json({
              success: false,
              message: 'This phone number has been verified!'
            })
          }
        }
      } else {
        res.status(403).json({
          success: false,
          message: 'This phone number has not been registered before!'
        })
      }
    }
  } catch (error) {
    res.status(403).json(error)
  }
})
// for route ('/verifyAccount')
// const result = await sendSMSVerify('XuanNghiemNguyen', req.body.phone)
// res.status(200).json(result)

router.get('/test-route', (req, res, next) => {
  res.status(200).send({
    nghiem: 'nghiem'
  })
})

module.exports = router
