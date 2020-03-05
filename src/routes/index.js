var express = require('express')
var router = express.Router()
var { connection } = require('../utils/mongodb')
var { User } = require('../models/user')
var bcrypt = require('bcryptjs')
var CryptoJS = require("crypto-js")

/* GET home page. */
router.get('/', (req, res, next) => {
  res.status(200).send('16vls web API')
})

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
    const userModel = await connection('User', User)
    userModel.findOne({ username }).then(async user => {
      if (user) {
        // Encrypt password
        // CryptoJS.AES.encrypt('xuanghjem', '16vls-secret').toString()
        // (xuanghjem) => (U2FsdGVkX19quFiQBuy4OzKtEAg0TTNkt/zzmg/hgAs=)
        
        // Decrypt password
        let hash = CryptoJS.AES.decrypt(password, '16vls-secret').toString(CryptoJS.enc.Utf8)
        const matched = await bcrypt.compare(hash, user.password)
        if (matched) {
          res.send(user)
        } else {
          res.send('Password is incorrect!')
        }
      } else {
        res.send('Username is not existed!')
      }
    })
  } catch (err) {
    res.send(new Error(err))
  }
})

router.get('/test-route', (req, res, next) => {
  res.status(200).send({
    nghiem: 'nghiem'
  })
})

module.exports = router
