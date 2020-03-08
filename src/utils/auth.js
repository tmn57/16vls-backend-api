const jwt = require('jsonwebtoken')
const User = require('../models/user')

  // using: 
  // const isAuthenticated = require('@utils/auth')
  // 
  // const auth = await isAuthenticated(req)
  // console.log(auth)
  // if (auth.statusCheck) {
  //   ...
  // } else {
  //   ...
  // }

const isAuthenticated = async req => {
  try {
    const { authorization } = req.headers
    const token = authorization.substring(7)
    const { userId } = jwt.verify(token, '16vls-secret')
    const userVerify = await User.findOne({ _id: userId, isVerified: true, isEnabled: true })
    if (userVerify) {
      return {
        statusCheck: true,
        message: 'Token is verified',
        userByToken: userVerify
      }
    } else {
      return {
        statusCheck: false,
        message: 'user not found'
      }
    }
  } catch (error) {
    return {
      statusCheck: false,
      message: 'invalid token'
    }
  }
}

module.exports = isAuthenticated
