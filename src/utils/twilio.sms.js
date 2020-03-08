// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
// DANGER! This is insecure. See http://twil.io/secure

const { ACCOUNT_SID, AUTH_TOKEN, phoneNumberVerify } = require('../utils/common')
const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN)

const sendSMSVerify = async (codeVerify, phone) => {
  try {
    if (!phoneNumberVerify.test(phone)) {
      return {
        success: false,
        message: 'invalid phone number!'
      }
    } else {
      const result = await client.messages
        .create({
          body: `16VLS: Verification code is - ${codeVerify}`,
          from: '+14243735858',
          to: phone
        })
      return {
        success: true,
        message: 'A message is sent!',
        content: result
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error
    }
  }
}

module.exports = sendSMSVerify