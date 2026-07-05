const { catComplaint, subCatComplaint, User } = require('../models');
const { Op } = require('sequelize');
const subCatComplaintsController = {

    // Get all subcategories with pagination, search, and filters
    getSubCategoryComplaints: async (req, res) => {
        try{
            const {
                page        = 1,
                limit       = 10,
                search      = '',
                status      = '',
                category_id = '',
                sort        = 'created_at',
                order       = 'desc',
            } = req.query;

            const pageNum   = parseInt(page, 10);
            const limitNum  = Math.min(parseInt(limit, 10), 100);
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }

            // Validate sort and order
            const validSortFields = ['subcategory', 'status', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            // Build where clause
            const where = {};
            if(search){
                where.subcategory = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            if(category_id){
                where.category_id = Number(category_id);
            }

            // Fetch subcategories with pagination
            const { rows, count } = await subCatComplaint.findAndCountAll({
                where,
                include: [
                    {
                        model: catComplaint,
                        as: 'category',
                        attributes: ['id', 'category', 'status'],
                        required: false
                    },
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
                success     : true,
                data        : rows,
                total       : count,
                page        : pageNum,
                limit       : limitNum,
                totalPages  : Math.ceil(count / limitNum)
            });
        }catch(err){
            console.error('getSubCategoryComplaints error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single subcategory by ID
    getSubCategoryComplaintsById: async (req, res) => {
        try{
            const { id }      = req.params;
            const subcategory = await subCatComplaint.findByPk(id, {
                include: [
                    {
                        model: catComplaint,
                        as: 'category',
                        attributes: ['id', 'category', 'status'],
                        required: false
                    },
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
            if(!subcategory){
                return res.status(404).json({
                    success: false,
                    message: 'Subcategory not found',
                });
            }
            res.status(200).json({
                success: true,
                data: subcategory,
            });
        }catch(err){
            console.error('getSubCategoryComplaintsById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subcategory',
            });
        }
    },

    // Create a subcategory entry
    createSubCategoryComplaint: async (req, res) => {
        const transaction = await subCatComplaint.sequelize.transaction();
        try{
            const { category_id, subcategory, status } = req.body;
            const userId = req.user.userId;
            const errors = {};
            // Category ID validation
            if(!category_id){
                errors.category_id = 'Category is required';
            }else{
                // Check if category exists
                const categoryExists = await catComplaint.findByPk(category_id, { transaction });
                if(!categoryExists){
                    errors.category_id = 'Category does not exist';
                }
            }
            // Subcategory validation
            if(!subcategory || !subcategory.trim()){
                errors.subcategory = 'Subcategory is required';
            }else 
            if(subcategory.trim().length > 255){
                errors.subcategory = 'Subcategory must not exceed 255 characters';
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
            // Check for duplicate subcategory within the same category
            const existingSubcategory = await subCatComplaint.findOne({
                where: {
                    category_id: category_id,
                    subcategory: subcategory.trim()
                },
                transaction
            });
            if(existingSubcategory){
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'Subcategory already exists in this category',
                });
            }
            const subcategoryData = {
                category_id : category_id,
                subcategory : subcategory.trim(),
                status      : status !== undefined ? Number(status) : 1,
                created_by  : userId || null,
                updated_by  : userId || null,
            };
            const newSubcategory = await subCatComplaint.create(subcategoryData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Subcategory created successfully'
            });
        }catch(err){
            await transaction.rollback();
            console.error('createSubCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update a subcategory entry
    updateSubCategoryComplaint: async (req, res) => {
        const transaction = await subCatComplaint.sequelize.transaction();
        try{
            const { id }  = req.params;
            const { category_id, subcategory, status } = req.body;
            const userId  = req.user.userId;
            // Check if subcategory exists
            const subcategoryRecord = await subCatComplaint.findByPk(id, { transaction });
            if(!subcategoryRecord){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Subcategory not found',
                });
            }
            const errors = {};
            // Category ID validation
            if(category_id !== undefined){
                if(!category_id){
                    errors.category_id = 'Category cannot be empty';
                }else{
                    const categoryExists = await catComplaint.findByPk(category_id, { transaction });
                    if(!categoryExists){
                        errors.category_id = 'Category does not exist';
                    }
                }
            }
            // Subcategory validation
            if(subcategory !== undefined){
                if(!subcategory || !subcategory.trim()){
                    errors.subcategory = 'Subcategory cannot be empty';
                }else 
                if(subcategory.trim().length > 255){
                    errors.subcategory = 'Subcategory must not exceed 255 characters';
                }else{
                    // Check for duplicate subcategory (excluding current record)
                    const checkCategoryId     = category_id !== undefined ? category_id : subcategoryRecord.category_id;
                    const existingSubcategory = await subCatComplaint.findOne({
                        where: {
                            category_id: checkCategoryId,
                            subcategory: subcategory.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if(existingSubcategory){
                        errors.subcategory = 'Subcategory already exists in this category';
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
            if(category_id !== undefined) updateData.category_id = category_id;
            if(subcategory !== undefined) updateData.subcategory = subcategory.trim();
            if(status !== undefined) updateData.status = Number(status);
            await subcategoryRecord.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Subcategory updated successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateSubCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a subcategory entry
    deleteSubCategoryComplaint: async (req, res) => {
        const transaction = await subCatComplaint.sequelize.transaction();
        try{
            const { id } = req.params;
            const subcategoryRecord = await subCatComplaint.findByPk(id, { transaction });
            if(!subcategoryRecord){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Subcategory not found',
                });
            }
            await subcategoryRecord.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Subcategory deleted successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteSubCategoryComplaint error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete subcategory',
            });
        }
    }
};

module.exports = subCatComplaintsController;