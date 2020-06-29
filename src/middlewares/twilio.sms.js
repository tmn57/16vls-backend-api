const TWILIO_ACCOUNT_SID = 'AC0902e936e1d650e2d1d324001900b31c'

const TWILIO_AUTH_TOKEN = 'aa8350d9dd8cbdd282b020a54a2f8970'

const VERIFICATION_SID = 'VA50745a71fa0bd9bf1e470aac235f3b24'

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
