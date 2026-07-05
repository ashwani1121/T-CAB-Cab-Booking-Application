const Coupon            = require('../models/couponsModel');
const { Vehicletypes }  = require('../models/vehicleTypesModel');
const { Op }            = require('sequelize');
const couponsController = {

    // Get all vehicle types
    getVehicleTypes: async (req, res) => {
        try{
            const vehicleTypes = await Vehicletypes.findAll({
                where: { status: 1 },
                attributes: ['id', 'name'],
            });
            res.status(200).json({
                success: true,
                data: vehicleTypes,
            });
        }catch(err){
            console.error('getVehicleTypes error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch vehicle types',
                errors: { server: err.message },
            });
        }
    },

    // Get all coupons with pagination, search, and filters
    getCoupons: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', status = '', coupon_type = '', sort = 'code',order = 'asc' } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);

            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }

            // Validate sort and order
            const validSortFields = [
                'code',
                'coupon_type',
                'discount_value',
                'starts_at',
                'expires_at',
                'status',
                'updated_at',
            ];
            const validOrder = ['asc', 'desc'];
            const sortField  = validSortFields.includes(sort) ? sort : 'code';
            const sortOrder  = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';

            // Build where clause
            const where = {};
            if(search){
                where.code = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            if(coupon_type && ['general', 'firstride', 'referral', 'seasonal', 'targeted'].includes(coupon_type)){
                where.coupon_type = coupon_type;
            }
            // Fetch coupons with pagination
            const { rows, count } = await Coupon.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
            });
            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: limitNum,
            });
        }catch(err){
            console.error('getCoupons error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Create a coupon
    createCoupon: async (req, res) => {
        try{
            const {
                code,
                coupon_type,
                description,
                special_message,
                discount_type,
                discount_value,
                max_discount,
                min_order_value,
                starts_at,
                expires_at,
                usage_limit,
                per_user_limit,
                vehicle_type_restrictions,
                is_public,
                status,
            } = req.body;
            const errors = {};
            // Code: Required, string, max 20 chars, unique
            if(!code || !code.trim()){
                errors.code = 'Coupon code is required';
            }else 
            if(code.length > 20){
                errors.code = 'Coupon code must not exceed 20 characters';
            }
            // Coupon Type: Required, valid enum
            if(!coupon_type || !['general', 'firstride', 'referral', 'seasonal', 'targeted'].includes(coupon_type)){
                errors.coupon_type = 'Coupon type must be one of: general, firstride, referral, seasonal, targeted';
            }
            // Description: Optional, string, max 500 chars
            if(description && description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            // Special Message: optional, string max 255 chars
            if (special_message && special_message.length > 256) {
                errors.special_message = 'Special message must not exceed 255 characters';
            }
            // Discount Type: Required, valid enum
            if(!discount_type || !['percentage', 'fixed'].includes(discount_type)){
                errors.discount_type = 'Discount type must be percentage or fixed';
            }

            // Discount Value: Required, positive number
            if(discount_value === undefined || isNaN(discount_value) || Number(discount_value) <= 0){
                errors.discount_value = 'Discount value must be a positive number';
            }else 
            if(discount_type === 'percentage' && Number(discount_value) > 100){
                errors.discount_value = 'Percentage discount cannot exceed 100';
            }

            // Max Discount: Optional, positive number
            if(max_discount !== undefined && (isNaN(max_discount) || Number(max_discount) <= 0)){
                errors.max_discount = 'Max discount must be a positive number';
            }

            // Min Order Value: Optional, positive number
            if(min_order_value !== undefined && (isNaN(min_order_value) || Number(min_order_value) <= 0)){
                errors.min_order_value = 'Minimum order value must be a positive number';
            }

            // Dates: Required, valid, start before expiry
            if(!starts_at || isNaN(Date.parse(starts_at))){
                errors.starts_at = 'Valid start date is required';
            }
            if(!expires_at || isNaN(Date.parse(expires_at))){
                errors.expires_at = 'Valid expiry date is required';
            }
            if(starts_at && expires_at && new Date(starts_at) >= new Date(expires_at)){
                errors.dates = 'Start date must be before expiry date';
            }

            // Usage Limit: Optional, positive integer
            if(usage_limit !== undefined && (isNaN(usage_limit) || !Number.isInteger(Number(usage_limit)) || Number(usage_limit) <= 0)){
                errors.usage_limit = 'Usage limit must be a positive integer';
            }

            // Per User Limit: Required, positive integer, min 1
            if(per_user_limit === undefined || isNaN(per_user_limit) || !Number.isInteger(Number(per_user_limit)) || Number(per_user_limit) < 1){
                errors.per_user_limit = 'Per user limit must be an integer of at least 1';
            }

            // Is Public: Required, boolean
            if(is_public === undefined || typeof is_public !== 'boolean'){
                errors.is_public = 'Public status must be selected as Yes or No';
            }

            // Status: Optional, 0 or 1
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }

            // Return validation errors
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            // Check for duplicate code
            const existingCoupon = await Coupon.findOne({ where: { code } });
            if(existingCoupon){
                return res.status(400).json({
                    success: false,
                    message: 'Coupon code already exists',
                    errors: { code: 'Coupon code must be unique' }
                });
            }

            const coupon = await Coupon.create({
                code: code.trim().toUpperCase(),
                coupon_type,
                description: description || null,
                special_message: special_message || null,
                discount_type,
                discount_value: Number(discount_value),
                max_discount: max_discount ? Number(max_discount) : null,
                min_order_value: min_order_value ? Number(min_order_value) : null,
                starts_at: new Date(starts_at),
                expires_at: new Date(expires_at),
                usage_limit: usage_limit ? Number(usage_limit) : null,
                per_user_limit: Number(per_user_limit),
                vehicle_type_restrictions: vehicle_type_restrictions,
                is_public,
                status: status !== undefined ? Number(status) : 1,
                created_at: new Date(),
                updated_at: new Date(),
            });

            res.status(201).json({
                success: true,
                data: coupon,
            });
        }catch(err){
            console.error('createCoupon error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Update a coupon
    updateCoupon: async (req, res) => {
        try{
            const { id } = req.params;
            const {
                code,
                coupon_type,
                description,
                special_message,
                discount_type,
                discount_value,
                max_discount,
                min_order_value,
                starts_at,
                expires_at,
                usage_limit,
                per_user_limit,
                vehicle_type_restrictions,
                is_public,
                status,
            } = req.body;
            const coupon = await Coupon.findByPk(id);
            if(!coupon){
                return res.status(404).json({
                    success: false,
                    message: 'Coupon not found'
                });
            }
            const errors = {};
            if(code !== undefined){
                if(!code || !code.trim()){
                    errors.code = 'Coupon code cannot be empty';
                }else 
                if(code.length > 20){
                    errors.code = 'Coupon code must not exceed 20 characters';
                }else{
                    const existingCoupon = await Coupon.findOne({
                        where: { code, id: { [Op.ne]: id } },
                    });
                    if(existingCoupon){
                        errors.code = 'Coupon code already exists';
                    }
                }
            }
            // Coupon Type: Optional, valid enum
            if(coupon_type !== undefined && !['general', 'firstride', 'referral', 'seasonal', 'targeted'].includes(coupon_type)){
                errors.coupon_type = 'Coupon type must be one of: general, firstride, referral, seasonal, targeted';
            }
            // Description: Optional, string, max 500 chars
            if(description !== undefined && description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            // Special Message: Optional, string, max 255 chars
            if (special_message !== undefined && special_message.length > 256) {
                errors.special_message = 'Special message must not exceed 255 characters';
            }
            // Discount Type: Optional, valid enum
            if(discount_type !== undefined && !['percentage', 'fixed'].includes(discount_type)){
                errors.discount_type = 'Discount type must be percentage or fixed';
            }
            // Discount Value: Optional, positive number
            if(discount_value !== undefined){
                if(isNaN(discount_value) || Number(discount_value) <= 0){
                    errors.discount_value = 'Discount value must be a positive number';
                }else if((discount_type || coupon.discount_type) === 'percentage' && Number(discount_value) > 100){
                    errors.discount_value = 'Percentage discount cannot exceed 100';
                }
            }
            // Max Discount: Optional, positive number
            if(max_discount !== undefined && (isNaN(max_discount) || Number(max_discount) <= 0)){
                errors.max_discount = 'Max discount must be a positive number';
            }
            // Min Order Value: Optional, positive number
            if(min_order_value !== undefined && (isNaN(min_order_value) || Number(min_order_value) <= 0)){
                errors.min_order_value = 'Minimum order value must be a positive number';
            }
            // Dates: Optional, valid, start before expiry
            if(starts_at !== undefined && isNaN(Date.parse(starts_at))){
                errors.starts_at = 'Valid start date is required';
            }
            if(expires_at !== undefined && isNaN(Date.parse(expires_at))){
                errors.expires_at = 'Valid expiry date is required';
            }
            if(starts_at !== undefined && expires_at !== undefined && new Date(starts_at) >= new Date(expires_at)){
                errors.dates = 'Start date must be before expiry date';
            }
            // Usage Limit: Optional, positive integer
            if(usage_limit !== undefined && (isNaN(usage_limit) || !Number.isInteger(Number(usage_limit)) || Number(usage_limit) <= 0)){
                errors.usage_limit = 'Usage limit must be a positive integer';
            }

            // Per User Limit: Optional, positive integer, min 1
            if(per_user_limit !== undefined && (isNaN(per_user_limit) || !Number.isInteger(Number(per_user_limit)) || Number(per_user_limit) < 1)){
                errors.per_user_limit = 'Per user limit must be an integer of at least 1';
            }

            // Is Public: Required, boolean
            if(is_public === undefined || typeof is_public !== 'boolean') {
                errors.is_public = 'Public status must be selected as Yes or No';
            }

            // Status: Optional, 0 or 1
            if(status !== undefined && ![0, 1].includes(Number(status))){
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }

            // Return validation errors
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }

            const updateData = {};
            if(code !== undefined) updateData.code                       = code.trim().toUpperCase();
            if(coupon_type !== undefined) updateData.coupon_type         = coupon_type;
            if(description !== undefined) updateData.description         = description || null;
            if(special_message !== undefined) updateData.special_message = special_message || null;
            if(discount_type !== undefined) updateData.discount_type     = discount_type;
            if(discount_value !== undefined) updateData.discount_value   = Number(discount_value);
            if(max_discount !== undefined) updateData.max_discount       = max_discount ? Number(max_discount) : null;
            if(min_order_value !== undefined)updateData.min_order_value  = min_order_value ? Number(min_order_value) : null;
            if(starts_at !== undefined) updateData.starts_at             = new Date(starts_at);
            if(expires_at !== undefined) updateData.expires_at           = new Date(expires_at);
            if(usage_limit !== undefined) updateData.usage_limit         = usage_limit ? Number(usage_limit) : null;
            if(per_user_limit !== undefined) updateData.per_user_limit   = Number(per_user_limit);
            if(vehicle_type_restrictions !== undefined) updateData.vehicle_type_restrictions = vehicle_type_restrictions ;
            if(is_public !== undefined) updateData.is_public = is_public;
            if(status !== undefined) updateData.status = Number(status);
            updateData.updated_at = new Date();
            await coupon.update(updateData);
            res.status(200).json({
                success: true,
                data: coupon,
            });
        }catch(err){
            console.error('updateCoupon error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Delete a coupon
    deleteCoupon: async (req, res) => {
        try{
            const { id } = req.params;
            const coupon = await Coupon.findByPk(id);
            if(!coupon){
                return res.status(404).json({
                    success: false,
                    message: 'Coupon not found'
                });
            }
            await coupon.destroy();
            res.status(200).json({
                success: true,
                message: 'Coupon deleted successfully',
            });
        }catch(err){
            console.error('deleteCoupon error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete coupon',
                errors : { server: err.message },
            });
        }
    }
};
module.exports = couponsController;