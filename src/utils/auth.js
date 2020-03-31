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
    const user = await User.findOne({ _id: userId })
    if (user) {
      if (user.isEnabled) {
        if (user.isVerified) {
          return {
            statusCheck: true,
            message: 'Token is correct: This account was verified!',
            userByToken: user
          }
        } else {
          return {
            statusCheck: true,
            message: 'Token is correct: This account was not verified!',
            userByToken: user
          }
        }
      } else {
        return {
          statusCheck: false,
          message:
          'This account have been locked, please contact to administrator!'
        }
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
