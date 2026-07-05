const { Op, Sequelize }   = require('sequelize');
const Vehicles            = require('../models/vehiclesModel');
const fs                  = require('fs');
const path                = require('path');
const BASE_URL            = process.env.BASE_URL || 'http://localhost:5000';
const vehiclesController  = {

    // Fetch all vehicles
    getVehicles: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', status = '', sort = 'name', order = 'asc' } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const validSortFields = ['name', 'status', 'updated_at', 'deposit'];
            const sortField       = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder       = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            const where           = {};
            if(search){
                const searchConditions = [
                    Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('name')),'LIKE', `%${search.toUpperCase()}%`)
                ];
                if(!isNaN(search) && search.trim() !== ''){
                    searchConditions.push({ deposit: { [Op.eq]: Number(search) } });
                }
                where[Op.or] = searchConditions;
            }
            // Handle status filter - check for both string and numeric values
            if(status === '1' || status === 1 || status === 'active'){
                where.status = 1;
            }else
            if(status === '0' || status === 0 || status === 'inactive'){
                where.status = 0;
            }
            const { rows, count } = await Vehicles.findAndCountAll({
                where,
                order : [[sortField, sortOrder]],
                limit : limitNum,
                offset: (pageNum - 1) * limitNum,
            });
            const responseData = rows.map((vehicle) => ({
                ...vehicle.dataValues,
                image: vehicle.image ? `${BASE_URL}/uploads/vehicles/${vehicle.image}` : null,
            }));
            res.status(200).json({
                success               : true,
                data                  : {
                    vehicles          : responseData,
                    pagination        : {
                        total_records : count,
                        current_page  : pageNum,
                        per_page      : limitNum,
                        total_pages   : Math.ceil(count / limitNum),
                        has_next      : pageNum < Math.ceil(count / limitNum),
                        has_prev      : pageNum > 1
                    }
                }
            });
        }catch(err){
            console.error('getVehicles error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!'
            });
        }
    },

    // Create a vehicle
    createVehicle: async (req, res) => {
        try{
            const data   = req.body || {};
            const errors = {};
            // Validate name
            if(!data.name || !data.name.trim()){
                errors.name = 'Name is required';
            }else if(data.name.length > 100){
                errors.name = 'Name must not exceed 100 characters';
            }else{
                // Check for unique name (case-insensitive using UPPER)
                const existingVehicle = await Vehicles.findOne({
                    where: Sequelize.where(
                        Sequelize.fn('UPPER', Sequelize.col('name')), 
                        'LIKE', 
                        data.name.trim().toUpperCase()
                    )
                });
                if(existingVehicle){
                    errors.name = 'Vehicle name already exists';
                }
            }
            if(data.description && data.description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            if(!req.file){
                errors.vehicleImage = 'Vehicle image is required';
            }
            if(!data.deposit || data.deposit === ''){
                errors.deposit = 'Security deposit is required';
            }else 
            if(isNaN(data.deposit) || Number(data.deposit) < 0){
                errors.deposit = 'Security deposit must be a valid positive number';
            }
            if(data.status === undefined || data.status === ''){
                errors.status = 'Status is required';
            }else 
            if(!["1","0"].includes(String(data.status))){
                errors.status = 'Status must be active (1) or inactive (0)';
            }
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            const imagePath = req.file ? req.file.filename : null;
            const vehicle   = await Vehicles.create({
                name        : data.name.trim(),
                deposit     : Number(data.deposit),
                description : data.description?.trim() || null,
                image       : imagePath,
                status      : Number(data.status),
            });
            res.status(201).json({
                success: true,
                message: 'Vehicle created successfully'
            });
        }catch(err){
            console.error('createVehicle error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Update a vehicle
    updateVehicle: async (req, res) => {
        try{
            const { id }  = req.params;
            const data    = req.body || {};
            const vehicle = await Vehicles.findByPk(id);
            if(!vehicle){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle not found'
                });
            }
            const errors = {};
            if(data.name !== undefined){
                if(!data.name || !data.name.trim()){
                    errors.name = 'Name cannot be empty';
                }else 
                if(data.name.length > 100){
                    errors.name = 'Name must not exceed 100 characters';
                }else{
                    // Check for unique name (excluding current vehicle, case-insensitive)
                    const existingVehicle = await Vehicles.findOne({
                        where: {
                            [Op.and]: [
                                Sequelize.where(
                                    Sequelize.fn('UPPER', Sequelize.col('name')), 
                                    'LIKE', 
                                    data.name.trim().toUpperCase()
                                ),
                                { id: { [Op.ne]: id } }
                            ]
                        }
                    });
                    if(existingVehicle){
                        errors.name = 'Vehicle name already exists';
                    }
                }
            }
            if(data.description !== undefined && data.description && data.description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            if(data.deposit !== undefined){
                if(!data.deposit || data.deposit === ''){
                    errors.deposit = 'Security deposit is required';
                } else if(isNaN(data.deposit) || Number(data.deposit) < 0){
                    errors.deposit = 'Security deposit must be a valid positive number';
                }
            }
            // Check if image is being removed but no new image provided
            if(data.imageRemoved === 'true' && !req.file && !vehicle.image){
                errors.vehicleImage = 'Vehicle image is required';
            }
            if(data.status !== undefined){
                if(!["1","0"].includes(String(data.status))){
                    errors.status = 'Status must be active (1) or inactive (0)';
                }
            }
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData = {};
            if(data.name !== undefined) updateData.name = data.name.trim();
            if(data.deposit !== undefined) updateData.deposit = Number(data.deposit);
            if(data.description !== undefined) updateData.description = data.description?.trim() || null;
            if(data.status !== undefined) updateData.status = Number(data.status);
            // Handle image updates
            if(req.file){
                // Delete old image if exists
                if(vehicle.image){
                    const oldImagePath = path.join(process.cwd(), 'uploads', 'vehicles', vehicle.image);
                    if(fs.existsSync(oldImagePath)){
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.image = req.file.filename;
            }else 
            if(data.imageRemoved === 'true' && vehicle.image){
                // Remove existing image
                const oldImagePath = path.join(process.cwd(), 'uploads', 'vehicles', vehicle.image);
                if(fs.existsSync(oldImagePath)){
                    fs.unlinkSync(oldImagePath);
                }
                updateData.image = null;
            }
            await vehicle.update(updateData);
            await vehicle.reload();
            res.status(200).json({
                success: true,
                message: 'Vehicle updated successfully'
            });
        }catch(err){
            console.error('updateVehicle error:', err);
            res.status(400).json({
                success: false,
                message: 'Failed to update vehicle'
            });
        }
    },

    // Delete a vehicle
    deleteVehicle: async (req, res) => {
        try{
            const { id }  = req.params;
            const vehicle = await Vehicles.findByPk(id);
            if(!vehicle){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle not found',
                });
            }
            // Delete associated image file
            if(vehicle.image){
                const imagePath = path.join(process.cwd(), 'uploads', 'vehicles', vehicle.image);
                if(fs.existsSync(imagePath)){
                    try{
                        fs.unlinkSync(imagePath);
                    }catch(fileErr){
                        console.error('Error deleting image file:', fileErr);
                        // Continue with database deletion even if file deletion fails
                    }
                }
            }
            await vehicle.destroy();
            res.status(200).json({
                success: true,
                message: 'Vehicle deleted successfully',
            });
        }catch(err){
            console.error('deleteVehicle error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete vehicle'
            });
        }
    },
};
module.exports = vehiclesController;