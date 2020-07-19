var CronJob = require('cron').CronJob;
const fb = require('../utils/firebase');
const NotificationServices = require('../services/notification')
const { multicastMessageQueue, updateMulticastMessageQueue } = require('./services')
const MAX_NOTIFICATIONS_PER_REQUEST = 10;
const OrderModel = require('../models/order');
const ReviewModel = require('../models/review');
const CartModel = require('../models/review');

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

var pushMulticastNotificationJob = new CronJob('10 * * * * *', async () => {
    if (!multicastMessageQueue.length) return;
    isPushing = true
    const { messageObject, tokens } = multicastMessageQueue.shift()
    console.log(`pushMulticastNotificationJob: sending `, messageObject, `for ${tokens.length} tokens`)
    const failedTokens = await fb.sendMulticast(tokens, messageObject)
    if (failedTokens && Array.isArray(failedTokens)) {
        console.log(`pushMulticastNotificationJob: sent got ${failedTokens.length} failed tokens`)
    }
    isPushing = false
})

var updateMessageQJob = new CronJob('5 * * * * *', () => {
    if (isPushing) return;
    updateMulticastMessageQueue()
})

var expiredReliableProductHandlingJob = new CronJob('59 * * * * *', async () => {
    const carts = await CartModel.find({});
    carts.forEach(cart => {
        cart.products.forEach(product => {
            if (product.reliablePrice > 0 && Date.now() > product.expiredTime) {
                //TODO: 'delete' item in cart
                //TODO: add notification to user
                //TODO: add report to admin
            }
        })
    })
})

var reliableProductWarningJob = new CronJob('* * 1 * * *', async () => {
    const carts = await CartModel.find({});
    carts.forEach(cart => {
        cart.products.forEach(product => {
            if (product.reliablePrice > 0 && ((product.expiredTime - Date.now()) < 10800000)) {
                //TODO: send warning notification to user
            }
        })
    })
})

var orderCompletedMockupJob = new CronJob('10 * * * * *', async () => {
    const orders = await OrderModel.find({ status: 'APPROVED', isCompleted: false });
    orders.map(async order => {
        const { userId } = order
        const newReviews = []
        order.products.map(product => {
            newReviews.push(new ReviewModel({
                userId,
                productId: product.productId,
            }))
        })

        await ReviewModel.insertMany(newReviews).catch(err => console.log(`orderCompletedMockupJob insert many reviews Error: `, err));

        order.isCompleted = true;
        order.markModified('isCompleted');
        await order.save();
    })
});

const init = () => {
    //pushNotificationJob.start()
    updateMessageQJob.start()
    pushMulticastNotificationJob.start()

    orderCompletedMockupJob.start();
    //expiredReliableProductHandlingJob.start();
    //eliableProductWarningJob.start();
}

module.exports = {
    init
}