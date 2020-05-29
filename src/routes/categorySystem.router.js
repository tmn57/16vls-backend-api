const express = require('express')
const router = express.Router()
const createError = require('http-errors')
const CategorySystem = require('../models/categorySystem')
const { isAdmin } = require('../utils/common')

router.post('/create', async (req, res, next) => {
    try {
        const { userId, type } = req.tokenPayload
        if (!isAdmin(type)) {
            return res.status(400).json({
                success: false,
                message: "Cannot create new category system!"
            })
        }
        const { name, description } = req.body
        if (!name) {
            throw createError(
                400,
                'Required field: Name'
            )
        } else {
            const existedName = await CategorySystem.findOne({ name })
            if (existedName) {
                return res.status(400).json({
                    success: false,
                    message: "CategorySystem's name is already existed!"
                })
            } else {
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
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.toString()
        })
    }
})


router.get('/all', async (req, res, next) => {
    try {
        const categoriesSystem = await CategorySystem.find()
        console.log(categoriesSystem)
        if (categoriesSystem && categoriesSystem.length > 0) {
            return res.status(200).json({
                success: true,
                result: categoriesSystem
            })
        } else {
            return res.status(400).json({
                success: false,
                message: 'Category system not found!'
            })
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.toString()
        })
    }
})


router.post('/delete', async (req, res, next) => {
    try {
        const { categorySystemId } = req.body
        const { userId, type } = req.tokenPayload
        if (!isAdmin(type)) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category system!"
            })
        }
        if (!categorySystemId) {
            throw createError(400, 'Required field: categorysystemId')
        } 
        else {
            const cateSystem = await CategorySystem.findById(categorySystemId)
            if (!cateSystem) {
                return res.status(400).json({
                    success: false,
                    message: 'Category system not found'
                })
            } else {
                const result = await CategorySystem.deleteOne({ _id: categorySystemId });
                console.log('resultaaaaaaaaaaaaa', result);
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
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.toString()
        })
    }
})


router.post('/update', async (req, res, next) => {
    try {
        const { _id, name, description} = req.body
        const { userId, type } = req.tokenPayload
        if (!isAdmin(type)) {
            return res.status(400).json({
                success: false,
                message: "Cannot update category system!"
            })
        }
        if (!_id || !name) {
            return res.status(400).json({
                success: false,
                message: 'Id, Name are required!'
            })
        }
        
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
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.toString()
        })
    }
})

module.exports = router
