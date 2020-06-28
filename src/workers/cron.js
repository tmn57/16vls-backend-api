var CronJob = require('cron').CronJob;
const fb = require('../utils/firebase');
const { messageQueue, updateMessageQueue } = require('./services')
const MAX_NOTIFICATIONS_PER_REQUEST = 10

let isPushing = false

var pushNotificationJob = new CronJob('7 * * * * *', () => {
    isPushing = true
    const notilen = Math.max(MAX_NOTIFICATIONS_PER_REQUEST, messageQueue.length)
    const chopIndex = messageQueue.length - notilen
    const sendingNotis = messageQueue.slice(chopIndex)
    if (!sendingNotis.length){
        isPushing = false;
        return;
    }
    messageQueue.splice(chopIndex, notilen)
    console.log(`sending batch of ${sendingNotis.length} FCM message(s)`)
    fb.sendBatch(sendingNotis)
    isPushing = false
})

var updateMessageQJob = new CronJob('15 * * * * *', () => {
    if (isPushing) return;
    updateMessageQueue()
})

const init = () => {
    pushNotificationJob.start()
    updateMessageQJob.start()
}

module.exports = {
    init
}