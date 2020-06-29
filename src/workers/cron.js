var CronJob = require('cron').CronJob;
const fb = require('../utils/firebase');
const { multicastMessageQueue, updateMulticastMessageQueue } = require('./services')
const MAX_NOTIFICATIONS_PER_REQUEST = 10

let isPushing = false

var pushNotificationJob = new CronJob('7 * * * * *', () => {
    // if(!messageQueue.length) return;
    // isPushing = true
    // const notilen = Math.max(MAX_NOTIFICATIONS_PER_REQUEST, messageQueue.length)
    // const chopIndex = messageQueue.length - notilen
    // const sendingNotis = messageQueue.slice(chopIndex)
    // if (!sendingNotis.length){
    //     isPushing = false;
    //     return;
    // }
    // messageQueue.splice(chopIndex, notilen)
    // console.log(`sending batch of ${sendingNotis.length} FCM message(s)`)
    // fb.sendBatch(sendingNotis)
    // isPushing = false
})

var pushMulticastNotificationJob = new CronJob('10 * * * * *', () => {
    if (!multicastMessageQueue.length) return;
    isPushing = true
    const { messageObject, tokens } = multicastMessageQueue.shift()
    console.log(`pushMulticastNotificationJob: sending `, messageObject,`for ${tokens.length} tokens`)
    fb.sendMulticast(tokens, messageObject)
    isPushing = false
})

var updateMessageQJob = new CronJob('5 * * * * *', () => {
    if (isPushing) return;
    updateMulticastMessageQueue()
})

const init = () => {
    //pushNotificationJob.start()
    updateMessageQJob.start()
    pushMulticastNotificationJob.start()
}

module.exports = {
    init
}