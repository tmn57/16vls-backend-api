const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const Product = require('../models/product')
const Store = require('../models/store')
const CategorySystem = require('../models/categorySystem')
const { isAdmin } = require('../utils/common')
const { isAuthenticated, storeOwnerRequired } = require('../middlewares/auth')
const asyncHandler = require('express-async-handler')
const { checkProductLiveStream } = require('../services/product')
const product = require('../services/product')

router.post('/create', async (req, res, next) => {
  try {
    const { userId } = req.tokenPayload
    const { name, images, category, variants, storeId, categorySystemId, price } = req.body

    const store = await Store.findOne({ userId })
    if (store) {
      if (!store.isApproved)
        return res.status(400).json({
          success: false,
          message: 'Shop của bạn chưa được duyệt, không thể tạo sản phẩm!'
        })
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản của bạn chưa được tạo shop!'
      })
    }

    if (!name || !images || !category || !variants || !storeId || !categorySystemId || !price) {
      throw createError(
        400,
        'Required field: name, images, category, variants, storeId, categorySystemId, price'
      )
    } else {
      const existedName = await Product.findOne({ name })
      if (existedName) {
        return res.status(400).json({
          success: false,
          message: "Tên sản phẩm đã tồn tại"
        })
      } else {
        let newProduct = new Product({
          createdBy: userId,
          storeId,
          ...req.body
        })
        await newProduct.save()
        return res.status(201).json({
          success: true,
          newProduct
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

router.get('/', async (req, res, next) => {
  try {
    // const { userId, type } = req.tokenPayload
    // const products = isAdmin(type)
    //   ? await Product.findById(_id )
    //   : await Product.findOne({ _id, createdBy: userId })

    const _id = req.query.id
    if (!_id) {
      return res.status(400).json({
        success: false,
        message: 'Required field: id'
      })
    }
    const product = await Product.findById(_id)

    if (product) {
      const productObj = product.toObject()
      productObj['liveInfo'] = checkProductLiveStream(product)
      return res.status(200).json({
        success: true,
        result: productObj
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.toString()
    })
  }
})

// router.get('/allByStore', async (req, res, next) => {
//   try {
//     const { userId, type } = req.tokenPayload
//     const storeId = req.query.id
//     const products = isAdmin(type)
//       ? await Product.find({ storeId })
//       : await Product.find({ storeId, createdBy: userId })
//     if (products && products.length > 0) {
//       return res.status(200).json({
//         success: true,
//         products
//       })
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: 'product not found!'
//       })
//     }
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.toString()
//     })
//   }
// })

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
    const products = isAdmin(type)
      ? await Product.find({ ...conditions })
      : await Product.find({ createdBy: userId, ...conditions })
    if (products && products.length > 0) {
      let productObjects = []
      products.forEach(p => {
        const productObj = p.toObject();
        productObj['liveInfo'] = checkProductLiveStream(p)
        productObjects.push(productObj)
      })
      return res.status(200).json({
        success: true,
        products: productObjects
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm nào với yêu cầu này'
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
      variants,
      storeId,
      description,
      tags,
      category,
      categorySystemId,
      images,
      price,
      promotionPrice
    } = content
    const { userId } = req.tokenPayload
    const product = await Product.findOne({ _id, createdBy: userId })
    if (product) {
      if (name) product.name = name
      if (storeId) product.storeId = storeId
      if (description) product.description = description
      if (images) product.images = images
      if (variants) product.variants = variants
      if (tags) product.tags = tags
      if (category) product.category = category
      if (categorySystemId) product.categorySystemId = categorySystemId
      if (price) product.price = price
      if (promotionPrice) product.promotionPrice = promotionPrice
      product.updatedAt = +new Date()
      product.updatedBy = userId
      await product.save()
      return res.status(201).json({
        success: true,
        result: product
      })
    } else {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy sản phẩm trong database'
      })
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.toString()
    })
  }
})


router.get('/allByCategorySystem', asyncHandler(async (req, res, next) => {
  const categorySystemId = req.query.categorySystemId

  if (!categorySystemId) {
    return res.status(400).json({
      success: false,
      message: "Required field: CategorySystemId"
    })
  }

  const products = await Product.find({ categorySystemId })

  let productObjects = []
  products.forEach(p => {
    const productObj = p.toObject();
    productObj['liveInfo'] = checkProductLiveStream(p)
    productObjects.push(productObj)
  })

  return res.status(200).json({
    success: true,
    result: productObjects
  })
}))

router.get('/allByCategoriesSystem', asyncHandler(async (req, res, next) => {

  const categoriesSystem = await CategorySystem.find()
  let listProducts = []
  for (let i = 0; i < categoriesSystem.length; i++) {
    const products = await Product.find({ categorySystemId: categoriesSystem[i].id }).limit(10)
    const productObjects = []
    products.forEach(p => {
      const productObj = p.toObject();
      productObj['liveInfo'] = checkProductLiveStream(p)
      productObjects.push(productObj)
    })
    listProducts.push({
      _id: categoriesSystem[i].id,
      systemCateName: categoriesSystem[i].name,
      products: productObjects
    })
  }
  return res.status(200).json({
    success: true,
    result: listProducts
  })
}))

router.get('/allByStore', asyncHandler(async (req, res, next) => {
  const storeId = req.query.id

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Required field: storeId"
    })
  }

  const currentStore = await Store.findById(storeId)
  const categories = currentStore.categories
  const result = [];

  for (let i = 0; i < categories.length; i++) {
    const products = await Product.find({ storeId, category: categories[i] }).limit(10)
    let productObjects = []
    products.forEach(p => {
      const productObj = p.toObject();
      productObj['liveInfo'] = checkProductLiveStream(p)
      productObjects.push(productObj)
    })
    result.push({
      categoryName: categories[i],
      listProducts: productObjects
    })
  }

  return res.status(200).json({
    success: true,
    result
  })

}))


router.get('/allByCategoryStore', asyncHandler(async (req, res, next) => {
  const storeId = req.query.storeId
  const category = req.query.categoryName
  if (!storeId || !category) {
    return res.status(400).json({
      success: false,
      message: "Required field: storeId, category name"
    })
  }

  const products = await Product.find({ storeId, category })
  let productObjects = []
  products.forEach(p => {
    const productObj = p.toObject();
    productObj['liveInfo'] = checkProductLiveStream(p)
    productObjects.push(productObj)
  })
  return res.status(200).json({
    success: true,
    result: productObjects
  })

}))


router.post('/search', asyncHandler(async (req, res, next) => {
  const { productName } = req.body
  const products = await Product.find({ $text: { $search: productName } }).exec()
  // .skip(20)
  // .limit(10)
  // .exec()
  let productObjects = []
  products.forEach(p => {
    const productObj = p.toObject();
    productObj['liveInfo'] = checkProductLiveStream(p)
    productObjects.push(productObj)
  })
  return res.status(200).json({
    success: true,
    result: productObjects
  })
}))

router.get('/getProductsOfOwner', isAuthenticated, storeOwnerRequired, asyncHandler(async (req, res) => {
  const storeId = req.storeId
  const products = await Product.find({ storeId })
  let productObjects = []
  products.forEach(p => {
    const productObj = p.toObject();
    productObj['liveInfo'] = checkProductLiveStream(p)
    productObjects.push(productObj)
  })
  res.status(200).json({
    success: true,
    data: productObjects
  })
}))

router.post('/review', isAuthenticated, asyncHandler(async (req, res, next) => {
  const { userId } = req.tokenPayload;
  const { rate, comment } = req.body


}))

module.exports = router
