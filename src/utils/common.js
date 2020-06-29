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
  phoneNumberVerify,
  getRandomCode,
  isAdmin,
  raiseError
}
module.exports = COMMON
