const express = require('express')
const router = express.Router()
const isAuthenticated = require('../middlewares/auth')

router.post('/create', async (req, res, next) => {
  try {
    const auth = await isAuthenticated(req)
    if (auth.statusCheck) {
      if (auth.userByToken.isVerified) {
        const shopOwner = auth.userByToken
        // be creating shop
      } else {
        return res.json({
          success: false,
          message: 'Please verify your account!'
        })
      }
    } else {
      return res.json({
        success: false,
        message: auth.message
      })
    }
  } catch (error) {
    return res.json({
      success: false,
      message: error.toString()
    })
  }
})

module.exports = router
