const jwt = require('jsonwebtoken')
const { JWT_KEY } = require('../config')
const createError = require('http-errors')

const isAuthenticated = (req, res, next) => {
  const token = req.headers['access-token']
  if (token) {
    jwt.verify(token, JWT_KEY, function (err, payload) {
      if (err) throw createError(401, err)
      req.tokenPayload = payload
      next()
    })
  } else {
    throw createError(401, 'token is not found.')
  }
}

module.exports = { isAuthenticated }
