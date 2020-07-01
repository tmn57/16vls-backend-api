var admin = require("firebase-admin");
var serviceAccount = require('../assets/adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vls-notifications.firebaseio.com"
});


//output: isSuccessfullySent
const sendSingle = async (registrationToken, messageObject) => {
    let msgObj = messageObject
    msgObj['token'] = registrationToken
    await admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('FCM Service: Successfully sent message:', response);
            return true;
        })
        .catch((error) => {
            console.log('FCM Service: Error sending message:', error);
            return false
        });
}

const sendMulticast = async (registrationTokens, messageObject) => {
    if (!Array.isArray(registrationTokens)) return []
    console.log(`FB sendMulticast called: sending notification : ${messageObject} to ${registrationTokens.length} tokens`)
    let msgObj = messageObject
    msgObj['tokens'] = registrationTokens
    console.log(`fb send multicast msgObj`, msgObj)
    delete msgObj['data']
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

const sendBatch = async (messageObjects) => {
    if (!Array.isArray(messageObjects)) return
    await admin.messaging().sendAll(messageObjects)
        .then((response) => {
            console.log('FCM service sent batch of msgs:' + response.successCount + ' messages were sent successfully');
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
    sendSingle,
    sendBatch
}