const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')
const jwt = require('jsonwebtoken')
const isAuthenticated = require('../utils/auth')
/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).send('16vls web API')
})

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
      const { username, password } = req.body
      if (!username || !password) {
        res.status(401).json({
          success: false,
          message: 'username and password are required!'
        })
      } else {
        User.findOne({ username }).then(async user => {
          if (user) {
            // Encrypt password
            // CryptoJS.AES.encrypt('xuanghjem', '16vls-secret').toString()
            // Test case :(username: xuanghjem, password: U2FsdGVkX19quFiQBuy4OzKtEAg0TTNkt/zzmg/hgAs=)

            // Decrypt password
            let hash = CryptoJS.AES.decrypt(password, '16vls-secret').toString(
              CryptoJS.enc.Utf8
            )
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
              res.status(401).json({
                success: false,
                message: 'Password is incorrect!'
              })
            }
          } else {
            res.status(401).json({
              success: false,
              message: 'Username is not existed!'
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

router.get('/test-route', (req, res, next) => {
  res.status(200).send({
    nghiem: 'nghiem'
  })
})

module.exports = router
