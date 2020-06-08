const express = require('express')
const router = express.Router()
// const createError = require('http-errors')
// const Cart = require('../models/cart')
// const Order = require('../models/order')
// const Product = require('../models/product')
// const asyncHandler = require('express-async-handler')

// router.post('/create', asyncHandler(async (req, res, next) => {
//     const { userId } = req.tokenPayload
//     const { listProducts, shippingAddress } = req.body


//     if (!listProducts || !shippingAddress) {
//         return res.status(400).json({
//             success: false,
//             message: "Required field: products, shippingAddress"
//         })
//     }
//     // check còn sp k

//     // add order
//     for (let i = 0; i < listProducts.length; i++) {
//         const newOrder = new Order()
//         newOrder.products = [...listProducts[i].products]
//         newOrder.storeId = listProducts[i].storeId
//         newOrder.transportationCost = listProducts[i].transportationCost
//         newOrder.shippingAddress = shippingAddress
//         newOrder.userId = userId
//         newOrder.createdBy = userId

//         let total = 0
//         for (let j = 0; j < listProducts[i].length; j++) {
//             total = total + listProducts[i].productPrice * listProducts[i].quantity
//         }
//         newOrder.totalMoney = total

//         await newOrder.save()
//     }

//     // remove Cart

//     // listProducts = [
//     //     {
//     //         "storeId": "5ed2643f9044f51c90999f31",
//     //         "transportationCost": 123123,
//     //         "products": [

//     //             {
//     //                 "expiredTime": 9007199254740991,
//     //                 "reliablePrice": 0,
//     //                 "variantIndex": 1,
//     //                 "quantity": 4,
//     //                 "_id": "5ed87c1d5d0e213354c7269e",
//     //                 "productId": "5ed2672a9044f51c90999f35",
//     //                 "productName": "Quần Jean Loại 2",
//     //                 "productImage": "18759816-4db5-4537-959b-f3c7c592afaa.jpg",
//     //                 "storeId": "5ed2643f9044f51c90999f31"
//     //             },

//     //             {
//     //                 "variant": {
//     //                     "color": "red",
//     //                     "size": "M"
//     //                 },
//     //                 "expiredTime": 9007199254740991,
//     //                 "reliablePrice": 0,
//     //                 "variantIndex": 0,
//     //                 "quantity": 2,
//     //                 "_id": "5ed89e8ffdf33a0f9442bc7c",
//     //                 "productId": "5ed65c9300a1343be40552b3",
//     //                 "productName": "Áo khoác Loại 3",
//     //                 "productImage": "18759816-4db5-4537-959b-f3c7c592afaa.jpg",
//     //                 "productPrice": 10000,
//     //                 "storeId": "5ed2643f9044f51c90999f31"
//     //             }
//     //         ]
//     //     },
//     //     {
//     //         "storeId": "5ed1ec3d7caf1b0ca93afc09",
//     //         "transportationCost": 123123,
//     //         "products": [
//     //             {
//     //                 "variant": {
//     //                     "color": "hong",
//     //                     "size": "Xl"
//     //                 },
//     //                 "expiredTime": 9007199254740991,
//     //                 "reliablePrice": 0,
//     //                 "variantIndex": 0,
//     //                 "quantity": 1,
//     //                 "_id": "5ed89f0afdf33a0f9442bc7e",
//     //                 "productId": "5ed663f5fbef61459865b5fd",
//     //                 "productName": "ao",
//     //                 "productImage": "98b22dc3-5b84-47e9-a4d0-602e75306c00.jpg",
//     //                 "productPrice": 123333,
//     //                 "storeId": "5ed1ec3d7caf1b0ca93afc09"
//     //             }
//     //         ]
//     //     }
//     // ]

//     // for (let i = 0; i < products.length; i++) {
//     //     let objProductOrder = {
//     //         productId: products[i].productId,
//     //         variantIndex: products[i].variantIndex,
//     //         quantity: products[i].quantity
//     //     }

//     //     const order = await Order.findOne({ $and: [{ userId: userId }, { storeId: products[i].storeId }, { isCompleted: false }] })
//     //     if (order) {
//     //         let check = false;
//     //         for (let j = 0; j < order.products; j++) {
//     //             if (order.products[j].productId == products[i].productId && order.products[j].variantIndex == products[i].variantIndex) {
//     //                 check = true
//     //                 order.products[j].quantity = order.products[j].quantity + products[i].quantity
//     //                 break;
//     //             }

//     //         }
//     //         if (!check) {
//     //             order.products.push(objProductOrder)
//     //         }
//     //         order.totalMoney = order.totalMoney + products[i].productPrice * products[i].quantity
//     //         await order.save()
//     //     }
//     //     else {
//     //         const newOrder = new Order()
//     //         newOrder.products.push(objProductOrder)
//     //         newOrder.storeId = products[i].storeId
//     //         newOrder.totalMoney = newOrder.totalMoney + products[i].productPrice * products[i].quantity
//     //         newOrder.transportationCost = products[i].transportationCost
//     //         newOrder.shippingAddress = shippingAddress
//     //         newOrder.userId = userId
//     //         newOrder.createdBy = userId

//     //         await newOrder.save()
//     //     }
//     // }

// }))


// router.get('/info', asyncHandler(async (req, res, next) => {
//     const { userId } = req.tokenPayload
//     const order = await Order.find({ $and: [{ userId: userId }, { isCompleted: false }] })
//     return res.status(200).json({
//         success: true,
//         result: cart
//     })
// }))


module.exports = router
