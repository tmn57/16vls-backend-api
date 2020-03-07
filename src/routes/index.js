const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const CryptoJS = require('crypto-js')

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).send('16vls web API')
})

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
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
          res.send(user)
        } else {
          console.log('Login failed: Password is incorrect!')
          res.send('Login failed: Password is incorrect!')
        }
      } else {
        console.log('Login failed: Username is not existed!')
        res.send('Login failed: Username is not existed!')
      }
    })
  } catch (err) {
    console.log('Error:', err)
    res.send(new Error(err))
  }
})

router.get('/test-route', (req, res, next) => {
  res.status(200).send({
    nghiem: 'nghiem'
  })
})

module.exports = router
