const ACCOUNT_SID = 'AC0902e936e1d650e2d1d324001900b31c'
const AUTH_TOKEN = '8c7eb39558ab67f8446440a492d84a71'
const phoneNumberVerify = new RegExp(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'im')

const COMMON = {
  ACCOUNT_SID,
  AUTH_TOKEN,
  phoneNumberVerify
}
module.exports = COMMON