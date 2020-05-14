const ACCOUNT_SID = 'AC0902e936e1d650e2d1d324001900b31c'

const AUTH_TOKEN = 'aa8350d9dd8cbdd282b020a54a2f8970'

const phoneNumberVerify = new RegExp(
  /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  'im'
)

const isAdmin = (type) => {
  return type === 'admin' ? true : false
}

const getRandomCode = () => {
  let ss = Math.floor(Math.random() * Math.floor(100000))
    .toString()
    .split('')
  while (ss.length < 6) {
    ss.unshift('0')
  }
  return ss.join('')
}

const raiseError = (statusCode, message) => {
  err = new Error(message)
  err.status = statusCode
  return err
}

const COMMON = {
  ACCOUNT_SID,
  AUTH_TOKEN,
  phoneNumberVerify,
  getRandomCode,
  isAdmin,
  raiseError
}
module.exports = COMMON
