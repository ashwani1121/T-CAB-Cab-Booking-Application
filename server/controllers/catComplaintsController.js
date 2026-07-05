const { catComplaint, User }  = require('../models');
const { Op }                  = require('sequelize');
const catComplaintsController = {

    // Get all category with pagination, search, and filters
    getCategoryComplaints: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination parameters
            if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            // Validate sort and order
            const validSortFields = ['category', 'status', 'created_at', 'updated_at'];
            const validOrder = ['asc', 'desc'];
            const sortField = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            // Build where clause for category
            const where = {};
            if(search){
                where.category = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            // Fetch Category with pagination
            const { rows, count } = await catComplaint.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
            });
            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            });
        }catch(err){
            console.error('getCategoryComplaints error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single category by ID
    getCategoryComplaintsById: async (req, res) => {
        try{
            const { id }   = req.params;
            const category = await catComplaint.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'updater',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    }
                ]
            });
            if(!category){
                return res.status(404).json({
                    success: false,
                    message: 'Category not found',
                });
            }
            res.status(200).json({
                success: true,
                data: category,
            });
        }catch(err){
            console.error('getCategoryComplaintsById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category',
            });
        }
    },

    // Create a category entry
    createCategoryComplaint: async (req, res) => {
        const transaction = await catComplaint.sequelize.transaction();
        try{
            const { category, status } = req.body;
            const userId = req.user.userId; 
            console.log("userId",userId);
            const errors = {};
            // category validation
            if(!category || !category.trim()){
                errors.category = 'Category is required';
            }else 
            if(category.trim().length > 255){
                errors.category = 'Category must not exceed 255 characters';
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            // Check for duplicate category
            const existingCategory = await catComplaint.findOne({
                where: {
                    category: category.trim()
                },
                transaction
            });
            if(existingCategory){
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Category already exists',
                });
            }
            const categoryData = {
                category: category.trim(),
                status: status !== undefined ? Number(status) : 1,
                created_by: userId || null,
                updated_by: userId || null,
            };
            const newCategory = await catComplaint.create(categoryData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Category created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update a category entry
    updateCategoryComplaint: async (req, res) => {
        const transaction = await catComplaint.sequelize.transaction();
        try{
            const { id }               = req.params;
            const { category, status } = req.body;
            const userId               = req.user.userId; 
            // Check if category exists
            const categoryRecord = await catComplaint.findByPk(id, { transaction });
            if(!categoryRecord){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Category not found',
                });
            }
            const errors = {};
            // Category validation
            if(category !== undefined){
                if(!category || !category.trim()){
                    errors.category = 'Category cannot be empty';
                }else 
                if(category.trim().length > 255){
                    errors.category = 'Category must not exceed 255 characters';
                }else{
                    // Check for duplicate category (excluding current record)
                    const existingCategory = await catComplaint.findOne({
                        where: {
                            category: category.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if(existingCategory){
                        errors.category = 'Category already exists';
                    }
                }
            }
            // Status validation
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData = {
                updated_by: userId || null
            };
            if(category !== undefined) updateData.category = category.trim();
            if(status !== undefined) updateData.status = Number(status);
            await categoryRecord.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a Category Complaints entry
    deleteCategoryComplaint: async (req, res) => {
        const transaction = await catComplaint.sequelize.transaction();
        try{
            const { id } = req.params;
            const categoryRecord = await catComplaint.findByPk(id, { transaction });
            if(!categoryRecord){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Category not found',
                });
            }
            await categoryRecord.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Category deleted successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete Category',
            });
        }
    }
};
module.exports = catComplaintsController;