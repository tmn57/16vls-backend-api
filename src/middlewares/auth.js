const jwt = require('jsonwebtoken')
const { raiseError } = require('../utils/common')
const { JWT_KEY } = require('../config')
const createError = require('http-errors')
const User = require('../models/user')
const storeModel = require('../models/store')

const isAuthenticated = (req, res, next) => {
  const token = req.headers['access-token']
  if (token) {
    jwt.verify(token, JWT_KEY, async (err, payload) => {
      if (err) return next(createError(401, err))
      req.tokenPayload = payload
      const { userId } = payload
      const user = await User.findById(userId)
      if (!user || !user.isEnabled) {
        return next(createError(401, 'this account not found or was blocked!'))
      }
      next()
    })
  } else {
    return next(createError(401, 'token is not found.'))
  }
}

const storeOwnerRequired = async (req, res, next) => {
  if (!req.tokenPayload.userId) {
    return next(raiseError(401, 'invalid userId'))
  }

  const userId = req.tokenPayload.userId

  await storeModel.findOne({ userId }).then(store => {
    if (!store) {
      return next(raiseError(401, 'this route only for seller'))
    }
    req.storeId = store._id.toString()
    next()
  }).catch(error => {
    return next(raiseError(500, error))
  })
}

const isAdministrator = async (req, res, next) => {
  if (!req.tokenPayload.userId) {
    return next(raiseError(401, 'invalid userId'))
  }

  if (req.tokenPayload.type == 'admin') {
    next()
  }
  else {
    return next(raiseError(401, 'Your account may not have permission to access!'))
  }
}

module.exports = { isAuthenticated, storeOwnerRequired, isAdministrator }
