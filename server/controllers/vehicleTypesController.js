const { Op, Sequelize }      = require('sequelize');
const VehicleTypes           = require('../models/vehicleTypesModel');
const Vehicles               = require('../models/vehiclesModel');
const Trips                  = require('../models/tripsModel');
const fs                     = require('fs');
const path                   = require('path');
const BASE_URL               = process.env.BASE_URL || 'http://localhost:5000';
const vehicleTypesController = {

    // Vehicle type search
    getVehicleTypes: async (req, res) => {
        try{
            const { page = 1, limit = 10, search = '', status = '', vehicle = '', sort = 'name', order = 'asc' } = req.query;
            const pageNum  = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            const validSortFields = ['name', 'status', 'updated_at'];
            const sortField       = validSortFields.includes(sort) ? sort : 'name';
            const sortOrder       = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'ASC';
            const where           = {};
            if(search){
                where.name = { [Op.like]: `%${search}%` };
            }
            if(status === '1' || status === 1 || status === 'active'){
                where.status = 1;
            }else
            if(status === '0' || status === 0 || status === 'inactive'){
                where.status = 0;
            }
            // Add vehicle filter
            if(vehicle && !isNaN(vehicle)){
                where.vehicle_id = parseInt(vehicle, 10);
            }
            const { rows, count } = await VehicleTypes.findAndCountAll({
                where,
                include: [{
                    model: Vehicles,
                    attributes: ['id', 'name'],
                    required: false
                }],
                order : [[sortField, sortOrder]],
                limit : limitNum,
                offset: (pageNum - 1) * limitNum,
            });
            const responseData = rows.map((vehicleType) => ({
                ...vehicleType.dataValues,
                vehicleName: vehicleType.Vehicle?.name || 'Unknown',
                image: vehicleType.image ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.image}` : null,
                mapImage: vehicleType.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.map_image}` : null, 
                animation: vehicleType.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.animation}` : null,
                commission: vehicleType.commission ? Number(vehicleType.commission) : 0.00,  
            }));
            const tripData = await Trips.findAll({
                attributes: ['id', 'trip']
            });
            // Fetch all vehicles for filter dropdown
            const vehicleData = await Vehicles.findAll({
                attributes: ['id', 'name'],
                where: { status: 1 },
                order: [['name', 'ASC']]
            });
            res.status(200).json({
                success : true,
                data    : responseData,
                trips   : tripData,
                vehicles: vehicleData,
                total   : count,
                page    : pageNum,
                limit   : limitNum,
            });
        }catch(err){
            console.error('getVehicleTypes error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Insert
    createVehicleType: async(req, res) => {
        try{
            const data   = req.body || {};
            const errors = {};
            // Name validation
            if(!data.name || !data.name.trim()){
                errors.name = 'Variant Name is required';
            }else 
            if(data.name.length > 100){
                errors.name = 'Variant Name must not exceed 100 characters';
            }else {
                // Check for unique name
                const existingVariant = await VehicleTypes.findOne({
                    where: Sequelize.where(
                        Sequelize.fn('UPPER', Sequelize.col('name')), 
                        'LIKE', 
                        data.name.trim().toUpperCase()
                    )
                });
                if(existingVariant){
                    errors.name = 'Vehicle name already exists';
                }
            }
            // Description validation
            if(data.description && data.description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            // Capacity validation
            if(!data.capacity || isNaN(data.capacity) || Number(data.capacity) <= 0){
                errors.capacity = 'Capacity is required and must be a valid positive number';
            }
            // commission validation
            if(data.commission !== undefined){
                const comm = Number(data.commission);
                if(isNaN(comm) || comm < 0){
                    errors.commission = 'Commission must be a non-negative number';
                }
            }
            // Vehicle Id validation
            if(!data.vehicle_id || isNaN(data.vehicle_id)){
                errors.vehicle_id = 'Vehicle ID is required and must be a valid number';
            }else{
                const vehicle = await Vehicles.findByPk(data.vehicle_id);
                if(!vehicle){
                    errors.vehicle_id = 'Vehicle not found';
                }
            }
            // Status
            if(data.status === undefined || data.status === null || isNaN(data.status)){
                errors.status = 'Status is required and must be a valid number';
            }
            // Image validation
            if(!req.files?.image){
                errors.vehicleImage = 'Vehicle image is required';
            }
            // Map Image validation 
            if(!req.files?.mapImage){
                errors.mapImage = 'Map image is required'; 
            }
            // Animation file validation
            if(!req.files?.animation){
                errors.animationFile = 'Animation file is required';
            }else{
                const animation = req.files.animation[0];
                const allowedExtensions = ['.json', '.gif'];
                const extension = path.extname(animation.originalname).toLowerCase();
                if(!allowedExtensions.includes(extension)){
                    errors.animationFile = 'Animation file must be a .json (Lottie) or .gif file';
                }
            }
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const imagePath      = req.files?.image ? req.files.image[0].filename : null;
            const mapImagePath   = req.files?.mapImage ? req.files.mapImage[0].filename : null;
            const animationPath  = req.files?.animation ? req.files.animation[0].filename : null; 
            const createData     = {
                name             : data.name.trim(),
                description      : data.description || null,
                image            : imagePath,
                map_image        : mapImagePath,
                animation        : animationPath,
                vehicle_id       : Number(data.vehicle_id),
                capacity         : Number(data.capacity),
                commission       : data.commission ? Number(data.commission) : 0.00,
                status           : data.status !== undefined ? Number(data.status) : 1,
            };
            const vehicleType = await VehicleTypes.create(createData);
            res.status(201).json({
                success: true,
                message: 'Vehicle price created successfully'
            });
        }catch(err){
            console.error('createVehicleType error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Update
    updateVehicleType: async (req, res) => {
        try{
            const { id } = req.params;
            const data   = req.body || {};
            // Check if vehicle type exists
            const vehicleType = await VehicleTypes.findByPk(id);
            if(!vehicleType){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle type not found'
                });
            }
            const errors = {};
            // Name validation
            if(data.name !== undefined){
                if(!data.name || !data.name.trim()){
                    errors.name = 'Variant Name cannot be empty';
                }else 
                if(data.name.length > 100){
                    errors.name = 'Variant Name must not exceed 100 characters';
                }else{
                    // Check for unique name (excluding current record)
                    const existingVariant = await VehicleTypes.findOne({
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
                    if(existingVariant){
                        errors.name = 'Variant name already exists';
                    }
                }
            }
            // Description validation
            if(data.description !== undefined && data.description && data.description.length > 500){
                errors.description = 'Description must not exceed 500 characters';
            }
            // Vehicle Id validation
            if(data.vehicle_id !== undefined){
                if(!data.vehicle_id || isNaN(data.vehicle_id)){
                    errors.vehicle_id = 'Vehicle ID must be a valid number';
                }else{
                    const vehicle = await Vehicles.findByPk(data.vehicle_id);
                    if(!vehicle){
                        errors.vehicle_id = 'Vehicle not found';
                    }
                }
            }
            // Capacity validation
            if(data.capacity !== undefined){
                if(!data.capacity || isNaN(data.capacity) || Number(data.capacity) <= 0){
                    errors.capacity = 'Capacity is required and must be a valid positive number';
                }
            }
            // commission value
            if(data.commission !== undefined){
                const comm = Number(data.commission);
                if(isNaN(comm) || comm < 0){
                    errors.commission = 'Commission must be a non-negative number';
                }
            }
            // status validation
            if(data.status !== undefined){
                if(data.status === '' || data.status === null || isNaN(data.status)){
                    errors.status = 'Status is required and must be a valid number';
                }
            }
            // Image validation 
            if(data.imageRemoved === 'true' && !req.files?.image && !vehicleType.image){
                errors.vehicleImage = 'Vehicle image is required';
            }
            // Map Image validation
            if(data.mapImageRemoved === 'true' && !req.files?.mapImage && !vehicleType.map_image){
                errors.mapImage = 'Map image is required'; 
            }
            // Animation validation
            if(data.animationRemoved === 'true' && !req.files?.animation && !vehicleType.animation){
                errors.animationFile = 'Animation file is required';
            }
            if(req.files?.animation){
                const animation = req.files.animation[0];
                const allowedExtensions = ['.json', '.gif'];
                const extension = path.extname(animation.originalname).toLowerCase();
                if (!allowedExtensions.includes(extension)) {
                    errors.animationFile = 'Animation file must be a .json (Lottie) or .gif file';
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
            if(data.vehicle_id !== undefined) updateData.vehicle_id       = Number(data.vehicle_id);
            if(data.capacity !== undefined) updateData.capacity           = Number(data.capacity);
            if(data.name !== undefined) updateData.name                   = data.name.trim();
            if(data.description !== undefined) updateData.description     = data.description || null;
            if(data.commission !== undefined) updateData.commission       = Number(data.commission);
            if(data.status !== undefined) updateData.status               = Number(data.status);
            // Handle animation file
            if(req.files?.animation){
                // Delete old animation file if exists
                if(vehicleType.animation){
                    const oldAnimationPath = path.join(process.cwd(), 'Uploads', 'vehicle-types', vehicleType.animation);
                    if(fs.existsSync(oldAnimationPath)){
                        try {
                            fs.unlinkSync(oldAnimationPath);
                        }catch (error){
                            console.error('Error deleting old animation:', error);
                        }
                    }
                }
                updateData.animation = req.files.animation[0].filename;
            }else 
            if(data.animationRemoved === 'true' && vehicleType.animation){
                // Delete existing animation file
                const oldAnimationPath = path.join(process.cwd(), 'Uploads', 'vehicle-types', vehicleType.animation);
                if(fs.existsSync(oldAnimationPath)){
                    try {
                        fs.unlinkSync(oldAnimationPath);
                    } catch (error) {
                        console.error('Error deleting animation:', error);
                    }
                }
                updateData.animation = null;
            }
            if(req.files?.image){
                // Delete old image if exists
                if(vehicleType.image){
                    const oldImagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.image);
                    if(fs.existsSync(oldImagePath)){
                        try{
                            fs.unlinkSync(oldImagePath);
                        }catch(error){
                            console.error('Error deleting old image:', error);
                        }
                    }
                }
                updateData.image = req.files.image[0].filename; 
            }else 
            if(data.imageRemoved === 'true' && vehicleType.image){
                // Delete existing image
                const oldImagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.image);
                if(fs.existsSync(oldImagePath)){
                    try{
                        fs.unlinkSync(oldImagePath);
                    }catch(error){
                        console.error('Error deleting image:', error);
                    }
                }
                updateData.image = null;
            }
            // Handle map image 
            if(req.files?.mapImage){
                // Delete old map image if exists
                if(vehicleType.map_image){
                    const oldMapImagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.map_image); 
                    if(fs.existsSync(oldMapImagePath)){
                        try{
                            fs.unlinkSync(oldMapImagePath);
                        }catch (error){
                            console.error('Error deleting old map image:', error);
                        }
                    }
                }
                updateData.map_image = req.files.mapImage[0].filename; 
            }else 
            if(data.mapImageRemoved === 'true' && vehicleType.map_image){
                // Delete existing map image
                const oldMapImagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.map_image); 
                if(fs.existsSync(oldMapImagePath)){
                    try{
                        fs.unlinkSync(oldMapImagePath);
                    }catch(error){
                        console.error('Error deleting map image:', error);
                    }
                }
                updateData.map_image = null;
            }
            // Only perform update if there's something to update
            if(Object.keys(updateData).length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'No data provided for update'
                });
            }
            await vehicleType.update(updateData);
            await vehicleType.reload();
            res.status(200).json({
                success: true,
                message: 'Vehicle Type updated successfully'
            });
        }catch(err){
            console.error('updateVehicleType error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Get vehicle type by ID
    getVehicleTypeById: async (req, res) => {
        try{
            const { id }      = req.params;
            const vehicleType = await VehicleTypes.findByPk(id, {
                include: [{
                    model: Vehicles,
                    attributes: ['id', 'name'],
                    required: false
                }]
            });
            if(!vehicleType){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle type not found'
                });
            }
            res.status(200).json({
                success: true,
                data: {
                    ...vehicleType.dataValues,
                    vehicleName: vehicleType.Vehicle?.name || 'Unknown',
                    image: vehicleType.image ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.image}` : null,
                    mapImage: vehicleType.map_image ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.map_image}` : null, 
                    animation: vehicleType.animation ? `${BASE_URL}/uploads/vehicle-types/${vehicleType.animation}` : null,
                },
            });
        }catch(err){
            console.error('getVehicleTypeById error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors: { server: err.message },
            });
        }
    },

    // Delete
    deleteVehicleType: async (req, res) => {
        try{
            const { id }      = req.params;
            const vehicleType = await VehicleTypes.findByPk(id);
            if(!vehicleType){
                return res.status(404).json({
                    success: false,
                    message: 'Vehicle type not found',
                });
            }
            // Delete image file if exists
            if(vehicleType.image){
                const imagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.image);
                if(fs.existsSync(imagePath)){
                    fs.unlinkSync(imagePath);
                }
            }
            // Delete map image file if exists
            if(vehicleType.map_image){
                const mapImagePath = path.join(process.cwd(), 'uploads', 'vehicle-types', vehicleType.map_image); 
                if(fs.existsSync(mapImagePath)){
                    try{
                        fs.unlinkSync(mapImagePath);
                    }catch(error){
                        console.error('Error deleting map image:', error);
                    }
                }
            }
            // Delete animation file if exists
            if(vehicleType.animation){
                const animationPath = path.join(process.cwd(), 'Uploads', 'vehicle-types', vehicleType.animation);
                if(fs.existsSync(animationPath)){
                    try{
                        fs.unlinkSync(animationPath);
                    }catch(error){
                        console.error('Error deleting animation:', error);
                    }
                }
            }
            await vehicleType.destroy();
            res.status(200).json({
                success: true,
                message: 'Vehicle type deleted successfully',
            });
        }catch(err){
            console.error('deleteVehicleType error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete vehicle type',
                errors : { server: err.message },
            });
        }
    }
};
module.exports = vehicleTypesController;