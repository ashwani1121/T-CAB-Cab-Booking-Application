const { Package }       = require('../models');
const { Op }            = require('sequelize');
const packageController = {

    // GET ALL PACKAGES (with pagination, search, filters)
    getPackages: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query; 
            const pageNum  = Math.max(1, parseInt(page, 10));
            const limitNum = Math.min(100, parseInt(limit, 10));
            // Validate pagination
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const where = {};
            // Search by name
            if(search){
                where.name = { [Op.like]: `%${search}%` }; 
            }
            // Filter by status
            if(['0', '1'].includes(status)){
                where.status = Number(status);
            }
            // Validate sort & order
            const validSortFields = ['name', 'km', 'advance', 'status', 'created_at', 'updated_at'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const { rows, count } = await Package.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
                col: 'Package.id',
                attributes: ['id', 'name', 'km', 'advance', 'status', 'created_at', 'updated_at'],
            });
            res.status(200).json({
                success: true,
                data: {
                    packages: rows,
                    pagination: {
                        total_records: count,
                        current_page: pageNum,
                        per_page: limitNum,
                        total_pages: Math.ceil(count / limitNum),
                    },
                },
            });
        }catch(err){
            console.error('getPackages error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // GET SINGLE PACKAGE BY ID
    getPackageById: async (req, res) => {
        try{
            const { id } = req.params;
            const pkg = await Package.findByPk(id, {
                attributes: ['id', 'name', 'km', 'advance', 'status', 'created_at', 'updated_at'],
            });
            if(!pkg){
                return res.status(404).json({
                    success: false,
                    message: 'Package not found',
                });
            }
            res.status(200).json({
                success: true,
                data: pkg,
            });
        }catch(err){
            console.error('getPackageById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch package',
            });
        }
    },

    // CREATE PACKAGE
    createPackage: async (req, res) => {
        const transaction = await Package.sequelize.transaction();
        try{
            const { name, km, advance, status } = req.body;
            const errors = {};
            // Name validation
            if(!name || !name.trim()){
                errors.name = 'Package name is required';
            }else
            if(name.trim().length > 100){
                errors.name = 'Package name must not exceed 100 characters';
            }
            // KM validation
            const kmNum = parseInt(km, 10);
            if(isNaN(kmNum) || kmNum < 1){
                errors.km = 'Distance must be a positive integer';
            }            
            // Advance validation
            const advanceNum = parseInt(advance, 10);
            if(isNaN(advanceNum) || advanceNum < 1 || advanceNum > 100){
                errors.advance = 'Advance percentage must be between 1 and 100';
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
            const packageData = {
                name: name.trim(),
                km: kmNum,
                advance: advanceNum,
                status: status !== undefined ? Number(status) : 1
            };
            const newPackage = await Package.create(packageData, { transaction });
            await transaction.commit();
            res.status(201).json({
                success: true,
                message: 'Package created successfully',
                data: newPackage,
            });
        }catch(err){
            await transaction.rollback();
            console.error('createPackage error:', err);
            if(err.name === 'SequelizeUniqueConstraintError'){
                return res.status(400).json({
                    success: false,
                    message: 'A package with this name already exists',
                    errors: { name: 'Package name must be unique' },
                });
            }
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // UPDATE PACKAGE
    updatePackage: async (req, res) => {
        const transaction = await Package.sequelize.transaction();
        try{
            const { id } = req.params;
            const { name, km, advance, status } = req.body;
            const pkg = await Package.findByPk(id, { transaction });
            if(!pkg){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Package not found',
                });
            }
            const errors     = {};
            const updateData = { updated_at: new Date() };
            // Name update
            if(name !== undefined){
                if(!name || !name.trim()){
                    errors.name = 'Package name cannot be empty';
                }else 
                if(name.trim().length > 100){
                    errors.name = 'Package name must not exceed 100 characters';
                }else{
                    updateData.name = name.trim();
                }
            }
            // KM update
            if(km !== undefined){
                const kmNum = parseInt(km, 10);
                if(isNaN(kmNum) || kmNum < 1){
                    errors.km = 'Distance must be a positive integer';
                }else{
                    updateData.km = kmNum;
                }
            }
            // Advance update
            if(advance !== undefined && advance !== null && advance !== ''){
                const advanceNum = parseInt(advance, 10);
                if(isNaN(advanceNum) || advanceNum < 1 || advanceNum > 100){
                    errors.advance = 'Advance percentage must be between 1 and 100';
                }else{
                    updateData.advance = advanceNum;
                }
            }
            // Status update
            if(status !== undefined){
                if(![0, 1].includes(Number(status))){
                    errors.status = 'Status must be 0 (inactive) or 1 (active)';
                }else{
                    updateData.status = Number(status);
                }
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            if(Object.keys(updateData).length === 1){ 
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update',
                });
            }
            await pkg.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Package updated successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('updatePackage error:', err);
            if(err.name === 'SequelizeUniqueConstraintError'){
                return res.status(400).json({
                    success: false,
                    message: 'Package name already exists',
                    errors: { name: 'Name must be unique' },
                });
            }
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // DELETE PACKAGE
    deletePackage: async (req, res) => {
        const transaction = await Package.sequelize.transaction();
        try{
            const { id } = req.params;
            const pkg    = await Package.findByPk(id, { transaction });
            if(!pkg){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Package not found',
                });
            }
            await pkg.destroy({ transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'Package deleted successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('deletePackage error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete package',
            });
        }
    },
};

module.exports = packageController;