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
const NotificationModel = require('../models/notification')
const NotificationService = require('../services/notification')
const { checkProductLiveStream, onChangeQuantityProductVariant } = require('../services/product')

router.post('/create', asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload
  const { name, phone, email, address, profileLink, ownerName } = req.body
  if (!phone || !name || !email || !address || !profileLink || !ownerName) {
    throw createError(400, 'Tên cửa hàng, SĐT, Email, Địa chỉ, Profile Link, Tên chủ cửa hàng là bắt buộc!')
  }
  else {

    const store = await Store.findOne({ userId })
    if (store) {
      if(store.isApproved)
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn đã có shop!'
      })
      else{
        return res.status(400).json({
          success: false,
          message: 'Tài khoản của bạn đã tạo shop và shop chưa được duyệt!'
        })
      }
    }

    if (!phoneNumberVerify.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ'
      })
    }
    const existedName = await Store.findOne({ name })
    if (existedName) {
      return res.status(400).json({
        success: false,
        message: "Tên cửa hàng đã tồn tại"
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
        message: 'Đang chờ duyệt',
        result: newStore
      })
    }
  }

}))

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
      message: 'Không tìm thấy cửa hàng'
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
        message: 'Người dùng này không có cửa hàng nào'
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
        message: 'Không tìm thấy cửa hàng nào theo yêu cầu'
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
      store.updatedBy = userId
      await store.save()
      return res.status(200).json({
        success: true,
        result: store
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy cửa hàng trong database'
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
      message: 'Không tìm thấy cửa hàng'
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

  const order = await Order.find({ $and: [{ storeId: store._id }, { isCompleted: false }, { status: 'PENDING' }] })

  let listOrders = []

  for (let i = 0; i < order.length; i++) {
    const user = await User.findById(order[i].userId)

    let listProductsOrder = []
    for (let j = 0; j < order[i].products.length; j++) {
      const product = await Product.findById(order[i].products[j].productId)

      let checkProductStream = checkProductLiveStream(product)
      let price = product.price
      if (checkProductStream != null) {
        price = checkProductStream.streamPrice
      }

      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: price,
        // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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
      message: 'ID cửa hàng không đúng'
    })
  }

  order.status = 'APPROVED'
  order.updatedBy = userId
  order.updatedAt = +new Date()
  await order.save();

  await NotificationService.sendToSingle(
    'Đơn hàng đã được duyệt',
    'Đơn hàng ' + order._id.toString() + ' đã được shop duyệt thành công',
    order.userId,
    -1
  )


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


  if (order.storeId != store._id) {
    return res.status(400).json({
      success: false,
      message: 'ID cửa hàng không đúng'
    })
  }

  order.status = 'REJECT'
  order.isCompleted = true
  order.updatedBy = userId
  order.updatedAt = +new Date()
  await order.save();


  for (let i = 0; i < order.products.length; i++) {
    const product = await Product.findById(order.products[i].productId)
    // product.variants[order.products[i].variantIndex].quantity = product.variants[order.products[i].variantIndex].quantity + order.products[i].quantity
    let listVariantsProduct = []
    for (let k = 0; k < product.variants.length; k++) {
      let objVariantInProduct = {}
      objVariantInProduct.color = product.variants[k].color
      objVariantInProduct.size = product.variants[k].size
      if (k == order.products[i].variantIndex) {
        objVariantInProduct.quantity = product.variants[k].quantity + order.products[i].quantity
      }
      else {
        objVariantInProduct.quantity = product.variants[k].quantity
      }
      listVariantsProduct.push(objVariantInProduct)
    }
    product.variants = listVariantsProduct
    await product.save()
  }

  await NotificationService.sendToSingle(
    'Đơn hàng đã hủy',
    'Đơn hàng ' + order._id.toString() + ' đã bị shop hủy, vui lòng đặt lại đơn hàng khác',
    order.userId,
    -1
  )

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

      let checkProductStream = checkProductLiveStream(product)
      let price = product.price
      if (checkProductStream != null) {
        price = checkProductStream.streamPrice
      }

      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: price,
        // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

      let checkProductStream = checkProductLiveStream(product)
      let price = product.price
      if (checkProductStream != null) {
        price = checkProductStream.streamPrice
      }

      let objProduct = {
        productId: order[i].products[j].productId,
        variantIndex: order[i].products[j].variantIndex,
        quantity: order[i].products[j].quantity,
        productName: product.name,
        productPrice: price,
        // productPrice: product.promotionPrice != 0 ? product.promotionPrice : product.price,
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

