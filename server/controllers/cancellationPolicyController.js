const CancellationPolicy = require('../models/cancellationPolicyModel');
const { Op } = require('sequelize');
const cancellationPolicyController = {

    // Get all cancellation policies with pagination, search, and filters
    getCancellationPolicy: async (req, res) => {
        try {
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;

            const pageNum  = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 10;

            if (isNaN(pageNum) || pageNum < 1 || (isNaN(limitNum) || (limitNum < 1 && limitNum !== 0))) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }

            const validSortFields = ['hours', 'percentage', 'status', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            const where = {};

            // Numeric search support
            if (search) {
                const searchNum = Number(search);
                if (!isNaN(searchNum)) {
                    where[Op.or] = [
                        { hours: searchNum },
                        { percentage: searchNum },
                    ];
                }
            }

            if (status === '1' || status === '0') {
                where.status = Number(status);
            }

            const findOptions = {
                where,
                order: [[sortField, sortOrder]],
                distinct: true,
            };

            let offset = 0;
            let actualLimit = limitNum;
            if (limitNum > 0) {
                actualLimit = Math.min(limitNum, 100);
                findOptions.limit = actualLimit;
                offset = (pageNum - 1) * actualLimit;
                findOptions.offset = offset;
            }

            const { rows, count } = await CancellationPolicy.findAndCountAll(findOptions);

            res.status(200).json({
                success: true,
                data: rows,
                total: count,
                page: pageNum,
                limit: actualLimit,
            });
        } catch (err) {
            console.error('getCancellationPolicy error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single cancellation policy by ID
    getCancellationPolicyById: async (req, res) => {
        try {
            const { id } = req.params;
            const cancellationPolicy = await CancellationPolicy.findByPk(id);

            if (!cancellationPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Cancellation Policy not found',
                });
            }

            res.status(200).json({
                success: true,
                data: cancellationPolicy,
            });
        } catch (err) {
            console.error('getCancellationPolicyById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch cancellation policy',
            });
        }
    },

    // Create a new cancellation policy
    createCancellationPolicy: async (req, res) => {
        const transaction = await CancellationPolicy.sequelize.transaction();
        try {
            const { hours, percentage, status } = req.body;
            const errors = {};

            // Validation
            if (hours === undefined || hours === null || isNaN(Number(hours))) {
                errors.hours = 'Hours must be a valid number';
            }

            if (percentage === undefined || percentage === null || isNaN(Number(percentage))) {
                errors.percentage = 'Percentage must be a valid number';
            }

            if (status !== undefined && ![0, 1].includes(Number(status))) {
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            const cancellationData = {
                hours: parseInt(hours),
                percentage: parseInt(percentage),
                status: status !== undefined ? Number(status) : 1,
            };

            await CancellationPolicy.create(cancellationData, { transaction });
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: 'Cancellation Policy created successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createCancellationPolicy error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update an existing cancellation policy
    updateCancellationPolicy: async (req, res) => {
        const transaction = await CancellationPolicy.sequelize.transaction();
        try {
            const { id } = req.params;
            const { hours, percentage, status } = req.body;

            const cancellationRecord = await CancellationPolicy.findByPk(id, { transaction });
            if (!cancellationRecord) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Cancellation Policy not found',
                });
            }

            const errors = {};

            if (hours !== undefined && (hours === '' || isNaN(Number(hours)))) {
                errors.hours = 'Hours must be a valid number';
            }

            if (percentage !== undefined && (percentage === '' || isNaN(Number(percentage)))) {
                errors.percentage = 'Percentage must be a valid number';
            }

            if (status !== undefined && ![0, 1].includes(Number(status))) {
                errors.status = 'Status must be 0 (inactive) or 1 (active)';
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            const updateData = { updated_at: new Date() };
            if (hours !== undefined) updateData.hours = parseInt(hours);
            if (percentage !== undefined) updateData.percentage = parseInt(percentage);
            if (status !== undefined) updateData.status = Number(status);

            await cancellationRecord.update(updateData, { transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Cancellation Policy updated successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('updateCancellationPolicy error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a cancellation policy
    deleteCancellationPolicy: async (req, res) => {
        const transaction = await CancellationPolicy.sequelize.transaction();
        try {
            const { id } = req.params;
            const cancellationPolicy = await CancellationPolicy.findByPk(id, { transaction });

            if (!cancellationPolicy) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Cancellation Policy not found',
                });
            }

            await cancellationPolicy.destroy({ transaction });
            await transaction.commit();

            res.status(200).json({
                success: true,
                message: 'Cancellation Policy deleted successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('deleteCancellationPolicy error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete cancellation policy',
            });
        }
    },
};

module.exports = cancellationPolicyController;