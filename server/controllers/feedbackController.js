const { Feedback } = require('../models');
const { Op } = require('sequelize');
const feedbackController = {
    // Get all feedback with pagination, search, and filters
    getFeedback: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                rating = '',
                sort   = 'created_at',
                order  = 'desc',
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
            const validSortFields = ['feedback', 'rating', 'status', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            // Build where clause for feedback
            const where = {};
            if(search){
                where.feedback = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            if(rating && [1, 2, 3, 4, 5].includes(Number(rating))){
                where.rating = Number(rating);
            }

            // Fetch feedback with pagination
            const { rows, count } = await Feedback.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
            });
            res.status(200).json({
                success : true,
                data    : rows,
                total   : count,
                page    : pageNum,
                limit   : limitNum,
            });
        }catch(err){
            console.error('getFeedback error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single feedback by ID
    getFeedbackById: async (req, res) => {
        try{
            const { id }   = req.params;
            const feedback = await Feedback.findByPk(id);
            if(!feedback){
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                });
            }
            res.status(200).json({
                success: true,
                data: feedback,
            });
        }catch(err){
            console.error('getFeedbackById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch feedback',
            });
        }
    },

    // Create a feedback entry
    createFeedback: async (req, res) => {
        const transaction = await Feedback.sequelize.transaction();
        try{
            const { feedback, rating, status } = req.body;
            const errors = {};
            // Feedback validation
            if(!feedback || !feedback.trim()){
                errors.feedback = 'Feedback is required';
            }else 
            if(feedback.trim().length > 255){
                errors.feedback = 'Feedback must not exceed 255 characters';
            }
            // Rating validation
            if(!rating || ![1, 2, 3, 4, 5].includes(Number(rating))){
                errors.rating = 'Rating must be an integer between 1 and 5';
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
            const feedbackData = {
                feedback   : feedback.trim(),
                rating     : Number(rating),
                status     : status !== undefined ? Number(status) : 1,
                created_at : new Date(),
                updated_at : new Date(),
            };
            await Feedback.create(feedbackData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Feedback created successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('createFeedback error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update a feedback entry
    updateFeedback: async (req, res) => {
        const transaction = await Feedback.sequelize.transaction();
        try{
            const { id } = req.params;
            const { feedback, rating, status } = req.body;
            // Check if feedback exists
            const feedbackRecord = await Feedback.findByPk(id, { transaction });
            if(!feedbackRecord){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                });
            }
            const errors = {};
            // Feedback validation
            if(feedback !== undefined){
                if(!feedback || !feedback.trim()){
                    errors.feedback = 'Feedback cannot be empty';
                }else 
                if(feedback.trim().length > 255){
                    errors.feedback = 'Feedback must not exceed 255 characters';
                }
            }
            // Rating validation
            if(rating !== undefined && ![1, 2, 3, 4, 5].includes(Number(rating))){
                errors.rating = 'Rating must be an integer between 1 and 5';
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
            const updateData                               = { updated_at: new Date() };
            if(feedback !== undefined) updateData.feedback = feedback.trim();
            if(rating !== undefined) updateData.rating     = Number(rating);
            if(status !== undefined) updateData.status     = Number(status);
            await feedbackRecord.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Feedback updated successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateFeedback error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete a feedback entry
    deleteFeedback: async (req, res) => {
        const transaction  = await Feedback.sequelize.transaction();
        try{
            const { id }   = req.params;
            const feedback = await Feedback.findByPk(id, { transaction });
            if(!feedback){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found',
                });
            }
            await feedback.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Feedback deleted successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteFeedback error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete feedback',
            });
        }
    },

    // Retrieve Feedback based on rating
    retrieveFeedback: async (req,res) => {
        try {
            const { rating } = req.params;
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;

            const pageNum   = parseInt(page, 10);
            const limitNum  = Math.min(parseInt(limit, 10), 100);
            // Validate rating parameter
            const ratingNum = parseInt(rating, 10);
            if (!rating || isNaN(ratingNum) || ![1, 2, 3, 4, 5].includes(ratingNum)) {
                return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5',
                });
            }

            // Validate pagination parameters
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }

            // Validate sort and order
            const validSortFields = ['feedback', 'rating', 'status', 'created_at', 'updated_at'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            // Build where clause
            const where = { rating: ratingNum };
            if(search){
                where.feedback = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            // Fetch feedback
            const { rows, count } = await Feedback.findAndCountAll({
                where,
                order      : [[sortField, sortOrder]],
                limit      : limitNum,
                offset     : (pageNum - 1) * limitNum,
                distinct   : true,
                attributes : ['id', 'rating', 'feedback', 'status', 'created_at', 'updated_at'],
            });
            res.status(200).json({
                success: true,
                message: `Feedback with rating ${rating} retrieved successfully`,
                data   : rows,
                total  : count,
                page   : pageNum,
                limit  : limitNum,
            });
        }catch(error){
            console.error('Failed to retrieve feedback:', error);
            return res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },
};
module.exports = feedbackController;