var CronJob = require('cron').CronJob;
const fb = require('../utils/firebase');
const NotificationServices = require('../services/notification')
const { multicastMessageQueue, updateMulticastMessageQueue } = require('./services')
const MAX_NOTIFICATIONS_PER_REQUEST = 10;
const OrderModel = require('../models/order');
const ReviewModel = require('../models/review');
const CartModel = require('../models/cart');
const ReportModel = require('../models/report');
const dayjs = require('dayjs');
const product = require('../models/product');

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
    carts.forEach(async cart => {
        const delProdIds = []
        cart.products.forEach(async (product, idx) => {
            if (product.reliablePrice > 0 && Date.now() > product.expiredTime) {
                //add notification to user
                await NotificationServices.sendToSingle(`Bạn đã hết hạn thanh toán sản phẩm chắc chắn mua`, `Việc không mua sản phẩm chắc chắn mua là vi phạm chính sách của hệ thống vì thế việc này sẽ được gửi đến Admin để giải quyết.`, cart.userId, -1)
                //TODO: add report to admin
                const newReport = new ReportModel({
                    userId: 'SYSTEM',
                    objectId: cart.userId,
                    objectType: 'user',
                    description: `Không thanh toán ${product.quantity} sản phẩm chắc chắn mua với tổng giá trị ${product.quantity * product.reliablePrice}₫`
                })
                await newReport.save();
                delProdIds.push(product.productId);
            }
        })
        //'delete' need-to-del-items in cart
        let { products } = cart
        for (let i = 0; i < delProdIds; i++) {
            for (let j = 0; j < products.length; j++) {
                if (products[j].productId === delProdIds[i]) {
                    products.splice(i, 1);
                    break;
                }
            }
        }
        cart.products = products;
        cart.markModified('products');
        await cart.save();
    })
})

var reliableProductWarningJob = new CronJob('* * 1 * * *', async () => {
    const carts = await CartModel.find({});
    carts.forEach(cart => {
        cart.products.forEach(async product => {
            if (product.reliablePrice > 0 && ((product.expiredTime - Date.now()) < 10800000)) {
                //send warning notification to user
                await NotificationServices.sendToSingle(`Bạn có sản phẩm chắc chắn mua chưa thanh toán`,
                    `Vui lòng kiểm tra giỏ hàng và thanh toán trước ${dayjs(product.expiredTime).format('HH:mm:ss DD/MM/YYYY')}`, cart.userId, -1, { target: 'shoppingCart' })
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
    expiredReliableProductHandlingJob.start();
    reliableProductWarningJob.start();
}

module.exports = {
    init
}