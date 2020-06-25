const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Store = require('../models/store')
const User = require('../models/user')
const Order = require('../models/order')
const Product = require('../models/product')
const asyncHandler = require('express-async-handler')
const { phoneNumberVerify, isAdmin } = require('../utils/common')
const { isAuthenticated, storeOwnerRequired, isAdministrator } = require('../middlewares/auth')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { name, phone } = req.body
    if (!phone || !name) {
      throw createError(400, 'phone and name are required!')
    } else {
      if (!phoneNumberVerify.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'invalid phone number!'
        })
      }
      const existedName = await Store.findOne({ name })
      if (existedName) {
        return res.status(400).json({
          success: false,
          message: "store's name is already existed!"
        })
      } else {
        let newStore = new Store({
          createdBy: userId,
          userId: userId,
          ownerId: userId,
          ...req.body
        })
        await newStore.save()
        return res.status(201).json({
          success: true,
          message: 'Wait for approval!',
          result: newStore
        })
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

// router.get('/', async (req, res, next) => {
//   try {
//     const { userId, type } = req.tokenPayload
//     const _id = req.query.id
//     const storeFound = await Store.findById( _id)
//     if (storeFound) {
//       return res.status(200).json({
//         success: true,
//         store: storeFound
//       })
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'store not found!'
//       })
//     }
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.toString()
//     })
//   }
// })


router.get('/', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const _id = req.query.id
  const store = await Store.findById(_id)

  if (!store) {
    return res.status(400).json({
      success: false,
      message: 'Store not found!'
    })
  }
  else {
    let listFollowers = store.followers;
    let check = listFollowers.map(val => val).some(el => el == userId)
    return res.status(200).json({
      success: true,
      result: {
        isFollowed: check,
        store: store
      }
    })
  }

}))

router.get('/all', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const storesFound = isAdmin(type)
      ? await Store.find({})
      : await Store.find({ createdBy: userId })
    if (storesFound && storesFound.length > 0) {
      return res.status(200).json({
        success: true,
        stores: storesFound
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'This user does not own any store!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})



router.post('/getByConditions', async (req, res, next) => {
  try {
    const { userId, type } = req.tokenPayload
    const { conditions } = req.body
    if (!conditions || Object.keys(conditions).length < 1) {
      return res.status(400).json({
        success: false,
        message: 'this route required 1 condition least'
      })
    }
    if (conditions.createdBy && !isAdmin(type)) delete conditions.createdBy
    const storesFound = isAdmin(type)
      ? await Store.find({ ...conditions })
      : await Store.find({ createdBy: userId, ...conditions })
    if (storesFound && storesFound.length > 0) {
      return res.status(200).json({
        success: true,
        stores: storesFound
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'there is no results for this conditions!'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

router.post('/update', async (req, res, next) => {
  try {
    const { _id, content } = req.body
    if (Object.keys(req.body).length < 1) {
      return res.status(400).json({
        success: false,
        message: 'nothing to update'
      })
    }
    if (!_id || !content) {
      return res.status(400).json({
        success: false,
        message: '_id, content are required!'
      })
    }
    const {
      name,
      phone,
      email,
      ownerName,
      address,
      profileLink,
      websiteLink,
      description,
      avatar
    } = content
    const { userId } = req.tokenPayload
    const store = await Store.findOne({ _id, createdBy: userId })
    if (store) {
      if (name) store.name = name
      if (email) store.email = email
      if (ownerName) store.ownerName = ownerName
      if (profileLink) store.profileLink = profileLink
      if (websiteLink) store.websiteLink = websiteLink
      if (description) store.description = description
      if (address) store.address = address
      if (phone) store.phone = phone
      if (avatar) store.avatar = avatar
      store.updatedAt = +new Date()
      await store.save()
      return res.status(201).json({
        success: true,
        result: store
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'store not found in database!'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})

router.post('/categories/update', async (req, res, next) => {
  try {
    const { categories, storeName } = req.body
    if (!categories || !storeName) {
      throw createError(400, 'required field: categories, storeName')
    } else {
      const storeFound = await Store.findOne({ name: storeName })
      if (!storeFound) {
        return res.status(400).json({
          success: false,
          message: 'store not found'
        })
      } else {
        storeFound.categories = [...categories]
        await storeFound.save()
        return res.status(201).json({
          success: true,
          storeFound
        })
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})


router.post('/updatestatus', isAdministrator, asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  const storeFound = await Store.findById(_id)
  if (!storeFound) {
    return res.status(400).json({
      success: false,
      message: 'Store not found!'
    })
  }
  else {
    storeFound.isApproved = true;
    await storeFound.save()
    return res.status(201).json({
      success: true,
      reuslt: storeFound
    })
  }
}))


router.post('/follow', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const { storeId } = req.body
  const user = await User.findById(userId)
  const store = await Store.findById(storeId)

  let removeFollow = false;
  for (let i = 0; i < user.storeFollowed.length; i++) {
    if (user.storeFollowed[i] == storeId) {
      removeFollow = true;
      user.storeFollowed.splice(i, 1);
      for (let j = 0; j < store.followers.length; j++) {
        if (store.followers[j] == userId) {
          store.followers.splice(j, 1);
          break;
        }
      }
      break;
    }
  }
  if (!removeFollow) {
    user.storeFollowed.push(storeId)
    store.followers.push(userId)
  }

  await user.save()
  await store.save();
  return res.status(201).json({
    success: true,
    result: {
      isFollowed: !removeFollow,
      store: store
    }
  })
}))


router.get('/orderOfStore', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload

  const store = await Store.findOne({ userId })

  const order = await Order.find({ $and: [{ storeId: store._id }, { isCompleted: false }, { status: 'PEDDING' }] })

  let listOrders = []

  for (let i = 0; i < order.length; i++) {
    const user = await User.findById(order[i].userId)

    let listProductsOrder = []
    for (let j = 0; j < order[i].products.length; j++) {
      const product = await Product.findById(order[i].products[j].productId)
      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
        productImage: product.images.length > 0 ? product.images[0] : '',
        productVariant: {
          color: product.variants[order[i].products[j].variantIndex].color,
          size: product.variants[order[i].products[j].variantIndex].size
        }

      }
      listProductsOrder.push(objProduct)
    }

    let d = new Date(order[i].createdAt)
    let objOrder = {
      _id: order[i]._id,
      status: order[i].status,
      products: [...listProductsOrder],
      isCompleted: order[i].isCompleted,
      storeId: order[i].storeId,
      totalMoney: order[i].totalMoney,
      description: order[i].description,
      transportationCost: order[i].transportationCost,
      shippingAddress: order[i].shippingAddress,
      userId: order[i].userId,
      userPhone: user.phone,
      userName: user.name,
      storeAvatar: store.avatar ? store.avatar : '',
      storeName: store.name,
      createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
        + '/' +
        ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
        + '/' +
        d.getFullYear()
    }
    listOrders.push(objOrder)
  }

  return res.status(200).json({
    success: true,
    result: listOrders
  })

}))


router.post('/approve', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const { orderId } = req.body

  const store = await Store.findOne({ userId })
  const order = await Order.findById(orderId)

  if (order.storeId != store._id) {
    return res.status(400).json({
      success: false,
      message: 'StoreId is incorrect!'
    })
  }

  order.status = 'APPROVED'
  order.updatedBy = userId
  user.updatedAt = +new Date()
  await order.save();

  return res.status(200).json({
    success: true,
    result: order
  })

}))


router.post('/reject', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const { orderId } = req.body

  const store = await Store.findOne({ userId })
  const order = await Order.findById(orderId)

  // cộng lại quantity

  if (order.storeId != store._id) {
    return res.status(400).json({
      success: false,
      message: 'StoreId is incorrect!'
    })
  }

  order.status = 'REJECT'
  order.isCompleted = true
  order.updatedBy = userId
  user.updatedAt = +new Date()
  await order.save();

  for (let i = 0; i < order.products.length; i++) {
    const product = await Product.findById(order.products[i].productId)
    product.variants[order.products[i].variantIndex].quantity = product.variants[order.products[i].variantIndex].quantity + order.products[i].quantity
    await product.save()
  }

  return res.status(200).json({
    success: true,
    result: order
  })

}))



router.get('/orderApproveOfStore', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload

  const store = await Store.findOne({ userId })

  const order = await Order.find({ $and: [{ storeId: store._id }, { status: 'APPROVED' }] })

  let listOrders = []

  for (let i = 0; i < order.length; i++) {
    const user = await User.findById(order[i].userId)

    let listProductsOrder = []
    for (let j = 0; j < order[i].products.length; j++) {
      const product = await Product.findById(order[i].products[j].productId)
      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
        productImage: product.images.length > 0 ? product.images[0] : '',
        productVariant: {
          color: product.variants[order[i].products[j].variantIndex].color,
          size: product.variants[order[i].products[j].variantIndex].size
        }

      }
      listProductsOrder.push(objProduct)
    }

    let d = new Date(order[i].createdAt)
    let objOrder = {
      _id: order[i]._id,
      status: order[i].status,
      products: [...listProductsOrder],
      isCompleted: order[i].isCompleted,
      storeId: order[i].storeId,
      totalMoney: order[i].totalMoney,
      description: order[i].description,
      transportationCost: order[i].transportationCost,
      shippingAddress: order[i].shippingAddress,
      userId: order[i].userId,
      userPhone: user.phone,
      userName: user.name,
      storeAvatar: store.avatar ? store.avatar : '',
      storeName: store.name,
      createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
        + '/' +
        ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
        + '/' +
        d.getFullYear()
    }
    listOrders.push(objOrder)
  }

  return res.status(200).json({
    success: true,
    result: listOrders
  })

}))


router.get('/orderRejectOfStore', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload

  const store = await Store.findOne({ userId })

  const order = await Order.find({ $and: [{ storeId: store._id }, { status: 'REJECT' }, { updatedBy: userId }] })

  let listOrders = []

  for (let i = 0; i < order.length; i++) {
    const user = await User.findById(order[i].userId)

    let listProductsOrder = []
    for (let j = 0; j < order[i].products.length; j++) {
      const product = await Product.findById(order[i].products[j].productId)
      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
        productImage: product.images.length > 0 ? product.images[0] : '',
        productVariant: {
          color: product.variants[order[i].products[j].variantIndex].color,
          size: product.variants[order[i].products[j].variantIndex].size
        }

      }
      listProductsOrder.push(objProduct)
    }

    let d = new Date(order[i].createdAt)
    let objOrder = {
      _id: order[i]._id,
      status: order[i].status,
      products: [...listProductsOrder],
      isCompleted: order[i].isCompleted,
      storeId: order[i].storeId,
      totalMoney: order[i].totalMoney,
      description: order[i].description,
      transportationCost: order[i].transportationCost,
      shippingAddress: order[i].shippingAddress,
      userId: order[i].userId,
      userPhone: user.phone,
      userName: user.name,
      storeAvatar: store.avatar ? store.avatar : '',
      storeName: store.name,
      createdAt: (d.getDate() < 10 ? ('0' + d.getDate()) : d.getDate())
        + '/' +
        ((d.getMonth() + 1) < 10 ? ('0' + (d.getMonth() + 1)) : (d.getMonth() + 1))
        + '/' +
        d.getFullYear()
    }
    listOrders.push(objOrder)
  }

  return res.status(200).json({
    success: true,
    result: listOrders
  })

}))

module.exports = router

