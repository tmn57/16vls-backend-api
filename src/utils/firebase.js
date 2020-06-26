var admin = require("firebase-admin");

var serviceAccount = require("/usr/share/firebase-admin/sak/vls-notifications-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vls-notifications.firebaseio.com"
});


//output: isSuccessfullySent
const sendSingle = (registrationToken, messageObject) => {
    let msgObj = messageObject
    msgObj['token'] = registrationToken
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
            return true;
        })
        .catch((error) => {
            console.log('Error sending message:', error);
            return false
        });
}

const sendMulticast = async (registrationTokens, messageObject) => {
    if (!Array.isArray(registrationTokens)) return []
    let msgObj = messageObject
    msgObj['tokens'] = registrationTokens
    await admin.messaging().sendMulticast(msgObj)
        .then((response) => {
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(registrationTokens[idx]);
                    }
                });
                console.log(`FCM service: push request's failed tokens: ${failedTokens}`)
                return failedTokens
            }
        });
}

const toMessageObject = (title, body, dataObject) => {
    let msgObj = {
        notification: {
            title,
            body
        }
    }
    if (typeof (dataObject) === 'object')
        msgObj['data'] = dataObject
    return msgObj
}

module.exports = {
    toMessageObject,
    sendMulticast,
    sendSingle
}