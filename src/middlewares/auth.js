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
      if (!user.isEnabled) {
        return res.status(401).json({ message: 'this account was blocked!' }) //error is found by promise func (is not handled in app.js)
      }
      next()
    })
  } else {
    throw createError(401, 'token is not found.')
  }
}

module.exports = { isAuthenticated }
