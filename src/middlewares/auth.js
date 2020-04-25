const jwt = require('jsonwebtoken')
const { JWT_KEY } = require('../config')
const createError = require('http-errors')
const User = require('../models/user')

const isAuthenticated = (req, res, next) => {
  const token = req.headers['access-token']
  if (token) {
    jwt.verify(token, JWT_KEY, async (err, payload) => {
      if (err) throw createError(401, err)
      req.tokenPayload = payload
      const { userId } = payload
      const user = await User.findOne({
        _id: userId
      })
      if (!user || !user.isEnabled) {
        return next(createError(401, 'this account not found or was blocked!'))
      }
      next()
    })
  } else {
    throw createError(401, 'token is not found.')
  }
}

module.exports = { isAuthenticated }
