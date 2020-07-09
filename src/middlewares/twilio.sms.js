const TWILIO_ACCOUNT_SID = 'ACa85badcf249b2d46c789f691490d72b0'

const TWILIO_AUTH_TOKEN = '6c1d875d46ce72e4a35d31f92685708d'

const VERIFICATION_SID = 'VA4b059e6b53f406d9b773950e3f87ff22'

const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

exports.sendSmsOtpCode = async ({ phone: to }) => {
  try {
    const verificationCreateRequest = await twilio.verify.v2
      .services(VERIFICATION_SID)
      .verifications.create({ to, channel: 'sms' })
    return verificationCreateRequest
  } catch (err) {
    throw err
  }
}

exports.checkSmsOtpCode = async ({ phone: to, code }) => {
  try {
    const verificationCreateRequest = await twilio.verify
      .services(VERIFICATION_SID)
      .verificationChecks.create({ to, code })
    return verificationCreateRequest
  } catch (err) {
    return false
  }
}
