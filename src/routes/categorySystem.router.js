const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const CategorySystem = require('../models/categorySystem')
const { isAdmin } = require('../utils/common')
const asyncHandler = require('express-async-handler')
const { isAuthenticated, storeOwnerRequired, isAdministrator } = require('../middlewares/auth')

router.post('/create', isAdministrator, asyncHandler(async (req, res, next) => {
    const { userId, type } = req.tokenPayload
    const { name, description } = req.body
    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Required field: Name"
        })
    }
    else {
        const existedName = await CategorySystem.findOne({ name })
        if (existedName) {
            return res.status(400).json({
                success: false,
                message: "CategorySystem's name is already existed!"
            })
        }
        else {
            let newCategorySystem = new CategorySystem({
                createdBy: userId,
                ...req.body
            })
            await newCategorySystem.save()
            return res.status(201).json({
                success: true,
                result: newCategorySystem
            })
        }
    }

}))


router.get('/all', asyncHandler(async (req, res, next) => {
    const categoriesSystem = await CategorySystem.find()
    return res.status(200).json({
        success: true,
        result: categoriesSystem
    })
}))


router.post('/delete', isAdministrator, asyncHandler(async (req, res, next) => {
    const { categorySystemId } = req.body
    if (!categorySystemId) {
        return res.status(400).json({
            success: false,
            message: "Required field: CategorySystemId"
        })
    }
    else {
        const cateSystem = await CategorySystem.findById(categorySystemId)
        if (!cateSystem) {
            return res.status(400).json({
                success: false,
                message: 'Category system not found'
            })
        }
        else {
            const result = await CategorySystem.deleteOne({ _id: categorySystemId });
            if (result.n == 1) {
                return res.status(201).json({
                    success: true,
                    message: 'Delete successfully!',
                })
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: 'Delete failed!',
                })
            }

        }
    }

}))


router.post('/update', isAdministrator, asyncHandler(async (req, res, next) => {
    const { _id, content } = req.body
    const { userId, type } = req.tokenPayload
    if (!_id || !content) {
        return res.status(400).json({
            success: false,
            message: 'Id, Name are required!'
        })
    }

    const { name, description } = content
    const cateSystem = await CategorySystem.findOne({ _id })
    if (cateSystem) {
        if (name) cateSystem.name = name
        cateSystem.description = description
        cateSystem.updatedBy = userId
        cateSystem.updatedAt = +new Date()
        await cateSystem.save()
        return res.status(201).json({
            success: true,
            result: cateSystem
        })
    }
    else {
        return res.status(401).json({
            success: false,
            message: 'Category system not found in database!'
        })
    }

}))

module.exports = router
