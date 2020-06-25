var admin = require("firebase-admin");

var serviceAccount = require("~/firebase-admin/sak/vls-notifications-firebase-adminsdk.json");

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

const sendMulticast = (registrationTokens, messageObject) => {
    if (Array.isArray(registrationTokens)) return []
    let msgObj = messageObject
    msgObj['tokens'] = registrationTokens
    admin.messaging().sendMulticast(msgObj)
        .then((response) => {
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(registrationTokens[idx]);
                    }
                });
                return failedTokens
            }
        });
}

const messageObject = (title, body, dataObject) => {
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
    getMessaging: admin.messaging
}