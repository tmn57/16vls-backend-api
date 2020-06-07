const express = require('express')
const router = express.Router()
// const createError = require('http-errors')
// const Cart = require('../models/cart')
// const Order = require('../models/order')
// const Product = require('../models/product')
// const asyncHandler = require('express-async-handler')

// router.post('/create', asyncHandler(async (req, res, next) => {
//     const { userId } = req.tokenPayload
//     const { products, shippingAddress } = req.body // list products in cart: {productId, quantity, variantIndex, storeId}


//     if (!products || !shippingAddress) {
//         return res.status(400).json({
//             success: false,
//             message: "Required field: products, shippingAddress"
//         })
//     }

//     products = [
//         {
//             productId: '1',
//             variantIndex: 0,
//             quantity: 1,
//             storeId: "1bc",
//             transportationCost: 12,
//             productName: String,
//             productImage: String,
//             productPrice: Number,
//         }
//         ,
//         {
//             productId: '2',
//             variantIndex: 20,
//             quantity: 12,
//             storeId: "2",
//             transportationCost: 15,
//             productName: String,
//             productImage: String,
//             productPrice: Number,
//         }
//     ]

//     for (let i = 0; i < products.length; i++) {
//         let objProductOrder = {
//             productId: products[i].productId,
//             variantIndex: products[i].variantIndex,
//             quantity: products[i].quantity
//         }

//         const order = await Order.findOne({ $and: [{ userId: userId }, { storeId: products[i].storeId }, { isCompleted: false }] })
//         if (order) {
//             let check = false;
//             for (let j = 0; j < order.products; j++) {
//                 if (order.products[j].productId == products[i].productId && order.products[j].variantIndex == products[i].variantIndex) {
//                     check = true
//                     order.products[j].quantity = order.products[j].quantity + products[i].quantity
//                     break;
//                 }

//             }
//             if (!check) {
//                 order.products.push(objProductOrder)
//             }
//             order.totalMoney = order.totalMoney + products[i].productPrice * products[i].quantity
//             await order.save()
//         }
//         else {
//             const newOrder = new Order()
//             newOrder.products.push(objProductOrder)
//             newOrder.storeId = products[i].storeId
//             newOrder.totalMoney = newOrder.totalMoney + products[i].productPrice * products[i].quantity
//             newOrder.transportationCost = products[i].transportationCost
//             newOrder.shippingAddress = shippingAddress
//             newOrder.userId = userId
//             newOrder.createdBy = userId

//             await newOrder.save()
//         }
//     }

//     // storeId: String,
//     // totalMoney: { type: Number, default: 0 }, // Sum([total per Product])
//     // description?: String,
//     // transportationCost: Number,
//     // shippingAddress: String,
//     // userId: String,

// }))


// router.get('/info', asyncHandler(async (req, res, next) => {
//     const { userId } = req.tokenPayload
//     const order = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }]})
//     return res.status(200).json({
//         success: true,
//         result: cart
//     })
// }))


module.exports = router
