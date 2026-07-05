const { Subscription }       = require('../models');
const { Op }                 = require('sequelize');
const subscriptionController = {

    // Get all subscription plans with pagination, search, and filters
    getPlans: async (req, res) => {
        try{
            const {
                page          = 1,
                limit         = 10,
                search        = '',
                status        = '',
                duration_type = '',
                is_popular    = '',
                sort          = 'sort_order',
                order         = 'asc',
            } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            // Validate sort and order
            const validSortFields = ['name', 'price', 'duration_value', 'sort_order', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'sort_order';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            // Build where clause
            const where = {};
            if(search){
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }
            if(status && ['active', 'inactive', 'archived'].includes(status)){
                where.status = status;
            }
            if(duration_type && ['days', 'rides'].includes(duration_type)){
                where.duration_type = duration_type;
            }
            if(is_popular === '1' || is_popular === '0'){
                where.is_popular = Number(is_popular);
            }
            // Fetch subscription plans with pagination
            const { rows, count } = await Subscription.findAndCountAll({
                where,
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
            });
        }catch(err){
            console.error('getPlans error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single subscription plan by ID
    getPlanById: async (req, res) => {
        try{
            const { id } = req.params;
            const plan   = await Subscription.findByPk(id);
            if(!plan){
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found',
                });
            }
            res.status(200).json({
                success: true,
                data: plan,
            });
        }catch(err){
            console.error('getPlanById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subscription plan',
            });
        }
    },

    // Create a subscription plan
    createPlan: async (req, res) => {
        const transaction = await Subscription.sequelize.transaction();
        try{
            const {
                name,
                description,
                price,
                duration_type,
                duration_value,
                commission_waiver,
                max_daily_rides,
                is_popular,
                sort_order,
                status
            } = req.body;
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Plan name is required';
            }else 
            if(name.trim().length > 100){
                errors.name = 'Plan name must not exceed 100 characters';
            }
            // Price validation
            if(price === undefined || price === null){
                errors.price = 'Price is required';
            }else
            if(isNaN(Number(price)) || Number(price) < 0){
                errors.price = 'Price must be a positive number';
            }
            // Duration type validation
            if (!duration_type || !['days', 'rides'].includes(duration_type)) {
                errors.duration_type = 'Duration type must be either "days" or "rides"';
            }
            // Duration value validation
            if (!duration_value || isNaN(Number(duration_value)) || Number(duration_value) < 1) {
                errors.duration_value = 'Duration value must be a positive integer';
            }
            // Commission waiver validation
            if (commission_waiver !== undefined && ![0, 1, true, false].includes(commission_waiver)) {
                errors.commission_waiver = 'Commission waiver must be 0 or 1';
            }
            // Max daily rides validation
            if (max_daily_rides !== undefined && max_daily_rides !== null) {
                if (isNaN(Number(max_daily_rides)) || Number(max_daily_rides) < 1) {
                    errors.max_daily_rides = 'Max daily rides must be a positive integer or null';
                }
            }
            // Is popular validation
            if (is_popular !== undefined && ![0, 1, true, false].includes(is_popular)) {
                errors.is_popular = 'Is popular must be 0 or 1';
            }
            // Sort order validation
            if(sort_order === undefined || sort_order === null){
                errors.sort_order = 'Sort order is required';
            }else
            if(isNaN(Number(sort_order)) || Number(sort_order) < 0){
                errors.sort_order = 'Sort order must be a positive number';
            }
            // Status validation
            if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
                errors.status = 'Status must be "active", "inactive", or "archived"';
            }
            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            // Check for duplicate plan name
            const existingPlan = await Subscription.findOne({
                where: { name: name.trim() },
                transaction
            });
            if (existingPlan) {
                await transaction.rollback();
                return res.status(409).json({
                    success: false,
                    message: 'A subscription plan with this name already exists',
                });
            }
            // If marking as popular, unmark all other plans
            if (is_popular === true || is_popular === 1) {
                await Subscription.update(
                    { is_popular: false },
                    { where: { is_popular: true }, transaction }
                );
            }
            const planData = {
                name: name.trim(),
                description: description?.trim() || null,
                price: Number(price),
                duration_type,
                duration_value: Number(duration_value),
                commission_waiver: commission_waiver !== undefined ? Boolean(commission_waiver) : true,
                max_daily_rides: max_daily_rides ? Number(max_daily_rides) : null,
                is_popular: is_popular !== undefined ? Boolean(is_popular) : false,
                sort_order: sort_order !== undefined ? Number(sort_order) : 0,
                status: status || 'active',
                created_by: req.user?.id || null,
                created_at: new Date(),
                updated_at: new Date(),
            };
            await Subscription.create(planData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Subscription plan created successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createPlan error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update a subscription plan
    updatePlan: async (req, res) => {
        const transaction = await Subscription.sequelize.transaction();
        try {
            const { id } = req.params;
            const {
                name,
                description,
                price,
                duration_type,
                duration_value,
                commission_waiver,
                max_daily_rides,
                is_popular,
                sort_order,
                status
            } = req.body;

            // Check if plan exists
            const plan = await Subscription.findByPk(id, { transaction });
            if (!plan) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found',
                });
            }

            const errors = {};

            // Name validation
            if (name !== undefined) {
                if (!name || !name.trim()) {
                    errors.name = 'Plan name cannot be empty';
                } else if (name.trim().length > 100) {
                    errors.name = 'Plan name must not exceed 100 characters';
                } else {
                    // Check for duplicate name
                    const existingPlan = await Subscription.findOne({
                        where: {
                            name: name.trim(),
                            id: { [Op.ne]: id }
                        },
                        transaction
                    });
                    if (existingPlan) {
                        errors.name = 'A subscription plan with this name already exists';
                    }
                }
            }

            // Price validation
            if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
                errors.price = 'Price must be a positive number';
            }

            // Duration type validation
            if (duration_type !== undefined && !['days', 'rides'].includes(duration_type)) {
                errors.duration_type = 'Duration type must be either "days" or "rides"';
            }

            // Duration value validation
            if (duration_value !== undefined && (isNaN(Number(duration_value)) || Number(duration_value) < 1)) {
                errors.duration_value = 'Duration value must be a positive integer';
            }

            // Commission waiver validation
            if (commission_waiver !== undefined && ![0, 1, true, false].includes(commission_waiver)) {
                errors.commission_waiver = 'Commission waiver must be 0 or 1';
            }

            // Max daily rides validation
            if (max_daily_rides !== undefined && max_daily_rides !== null) {
                if (isNaN(Number(max_daily_rides)) || Number(max_daily_rides) < 1) {
                    errors.max_daily_rides = 'Max daily rides must be a positive integer or null';
                }
            }

            // Is popular validation
            if (is_popular !== undefined && ![0, 1, true, false].includes(is_popular)) {
                errors.is_popular = 'Is popular must be 0 or 1';
            }

            // Sort order validation
            if (sort_order !== undefined && (isNaN(Number(sort_order)) || Number(sort_order) < 0)) {
                errors.sort_order = 'Sort order must be a non-negative integer';
            }

            // Status validation
            if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
                errors.status = 'Status must be "active", "inactive", or "archived"';
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            // If marking as popular, unmark all other plans
            if (is_popular === true || is_popular === 1) {
                await Subscription.update(
                    { is_popular: false },
                    { 
                        where: { 
                            is_popular: true,
                            id: { [Op.ne]: id }
                        }, 
                        transaction 
                    }
                );
            }

            const updateData = { 
                updated_at: new Date(),
                updated_by: req.user?.id || null
            };
            
            if (name !== undefined) updateData.name = name.trim();
            if (description !== undefined) updateData.description = description?.trim() || null;
            if (price !== undefined) updateData.price = Number(price);
            if (duration_type !== undefined) updateData.duration_type = duration_type;
            if (duration_value !== undefined) updateData.duration_value = Number(duration_value);
            if (commission_waiver !== undefined) updateData.commission_waiver = Boolean(commission_waiver);
            if (max_daily_rides !== undefined) updateData.max_daily_rides = max_daily_rides ? Number(max_daily_rides) : null;
            if (is_popular !== undefined) updateData.is_popular = Boolean(is_popular);
            if (sort_order !== undefined) updateData.sort_order = Number(sort_order);
            if (status !== undefined) updateData.status = status;

            await plan.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Subscription plan updated successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('updatePlan error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a subscription plan
    deletePlan: async (req, res) => {
        const transaction = await Subscription.sequelize.transaction();
        try {
            const { id } = req.params;
            const plan = await Subscription.findByPk(id, { transaction });

            if (!plan) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Subscription plan not found',
                });
            }

            await plan.destroy({ transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Subscription plan deleted successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('deletePlan error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete subscription plan',
            });
        }
    }
};
module.exports = subscriptionController;