const { Licensing } = require('../models');
const { Op }        = require('sequelize');

// Helper to generate license_id: LIC-IND-YYYY-XXXX
const generateLicenseId  = async (transaction) => {
    const year           = new Date().getFullYear();
    const prefix         = `LIC-IND-${year}-`;
    const lastLicense    = await Licensing.findOne({
        where: {
            license_id: { [Op.like]: `${prefix}%` }
        },
        order: [['license_id', 'DESC']],
        transaction
    });
    let nextNumber       = 1;
    if(lastLicense){
        const lastNumber = parseInt(lastLicense.license_id.split('-').pop(), 10);
        nextNumber       = lastNumber + 1;
    }
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const licensingController = {

    // Get all licensing with pagination, search, filters, sorting
    getLicensing: async (req, res) => {
        try{
            const {
                page   = 1,
                limit  = 10,
                search = '',
                status = '',
                plan   = '',
                sort   = 'created_at',
                order  = 'desc',
            } = req.query;

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            const validSortFields = ['license_id', 'client_name', 'company_name', 'domain', 'plan', 'status', 'expiry_on', 'created_at', 'updated_at'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const where           = {};
            if(search){
                where[Op.or] = [
                    { license_id: { [Op.like]: `%${search}%` } },
                    { client_name: { [Op.like]: `%${search}%` } },
                    { company_name: { [Op.like]: `%${search}%` } },
                    { domain: { [Op.like]: `%${search}%` } }
                ];
            }
            if(['active', 'suspended', 'terminated'].includes(status)){
                where.status = status;
            }
            if(['lifetime', 'monthly', 'yearly'].includes(plan)){
                where.plan = plan;
            }
            const { rows, count } = await Licensing.findAndCountAll({
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
            console.error('getLicensing error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get single licensing by ID
    getLicensingById: async (req, res) => {
        try{
            const { id }    = req.params;
            const licensing = await Licensing.findByPk(id);
            if(!licensing){
                return res.status(404).json({
                    success: false,
                    message: 'License not found',
                });
            }
            res.status(200).json({
                success: true,
                data: licensing,
            });
        }catch(err){
            console.error('getLicensingById error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch license',
            });
        }
    },

    // Create a licensing entry
    createLicensing: async (req, res) => {
        const transaction = await Licensing.sequelize.transaction();
        try {
            const {
                client_name,
                company_name,
                domain,
                server_ip,
                plan,
                expiry_on,
                status
            } = req.body;

            const errors = {};

            if (!client_name || !client_name.trim()) errors.client_name = 'Client name is required';
            if (!company_name || !company_name.trim()) errors.company_name = 'Company name is required';
            if (!domain || !domain.trim()) errors.domain = 'Domain is required';
            if (!plan || !['lifetime', 'monthly', 'yearly'].includes(plan)) errors.plan = 'Plan must be lifetime, monthly, or yearly';
            
            // For lifetime plan, expiry_on is optional (no expiry)
            // For monthly/yearly plans, expiry_on is required
            if (plan === 'monthly' || plan === 'yearly') {
                if (!expiry_on) {
                    errors.expiry_on = 'Expiry date is required for monthly/yearly plans';
                }
            }

            if (status !== undefined && !['active', 'suspended', 'terminated'].includes(status)) {
                errors.status = 'Status must be active, suspended, or terminated';
            }

            if (Object.keys(errors).length > 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            const license_id = await generateLicenseId(transaction);

            const licensingData = {
                license_id,
                client_name: client_name.trim(),
                company_name: company_name.trim(),
                domain: domain.trim(),
                server_ip: server_ip ? server_ip.trim() : null,
                plan,
                expiry_on: (plan === 'lifetime') ? null : expiry_on, // Lifetime has no expiry
                status: status || 'active',
            };

            await Licensing.create(licensingData, { transaction });
            await transaction.commit();

            res.status(201).json({
                success: true,
                message: 'License created successfully',
            });
        } catch (err) {
            await transaction.rollback();
            console.error('createLicensing error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update a licensing entry
    updateLicensing: async (req, res) => {
        const transaction = await Licensing.sequelize.transaction();
        try{
            const { id } = req.params;
            const {
                client_name,
                company_name,
                domain,
                server_ip,
                plan,
                expiry_on,
                status
            } = req.body;
            const licensing = await Licensing.findByPk(id, { transaction });
            if(!licensing){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'License not found',
                });
            }
            const errors = {};
            if(client_name !== undefined && (!client_name || !client_name.trim())) errors.client_name = 'Client name cannot be empty';
            if(company_name !== undefined && (!company_name || !company_name.trim())) errors.company_name = 'Company name cannot be empty';
            if(domain !== undefined && (!domain || !domain.trim())) errors.domain = 'Domain cannot be empty';
            if(plan !== undefined && !['lifetime', 'monthly', 'yearly'].includes(plan)) errors.plan = 'Plan must be lifetime, monthly, or yearly';
            if(status !== undefined && !['active', 'suspended', 'terminated'].includes(status)) errors.status = 'Invalid status';
            // Validate expiry based on plan
            const updatedPlan = plan !== undefined ? plan : licensing.plan;
            if((updatedPlan === 'monthly' || updatedPlan === 'yearly') && expiry_on !== undefined && !expiry_on){
                errors.expiry_on = 'Expiry date is required for monthly/yearly plans';
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            const updateData = { updated_at: new Date() };
            if(client_name !== undefined) updateData.client_name = client_name.trim();
            if(company_name !== undefined) updateData.company_name = company_name.trim();
            if(domain !== undefined) updateData.domain = domain.trim();
            if(server_ip !== undefined) updateData.server_ip = server_ip ? server_ip.trim() : null;
            if(plan !== undefined){
                updateData.plan = plan;
                // If changing to lifetime, clear expiry
                if (plan === 'lifetime') {
                    updateData.expiry_on = null;
                }
            }
            if(expiry_on !== undefined) updateData.expiry_on = expiry_on;
            if(status !== undefined) updateData.status = status;
            await licensing.update(updateData, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'License updated successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('updateLicensing error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Soft delete (set status to terminated)
    deleteLicensing: async (req, res) => {
        const transaction   = await Licensing.sequelize.transaction();
        try{
            const { id }    = req.params;
            const licensing = await Licensing.findByPk(id, { transaction });
            if(!licensing){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'License not found',
                });
            }
            await licensing.update({ status: 'terminated', updated_at: new Date() }, { transaction });
            await transaction.commit();
            res.status(200).json({
                success: true,
                message: 'License deleted successfully',
            });
        }catch(err){
            await transaction.rollback();
            console.error('deleteLicensing error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to delete license',
            });
        }
    },

    // Verify license 
    verifyLicense: async (req, res) => {
        try{
            const { license_id, domain } = req.body;
            if(!license_id || !domain){
                return res.status(400).json({
                    success: false,
                    message: 'License ID and domain are required',
                });
            }
            const licensing = await Licensing.findOne({
                where: { license_id: license_id.trim() }
            });
            if(!licensing){
                return res.status(404).json({
                    success: false,
                    message: 'License not found',
                    valid: false
                });
            }
            // Check if domain matches
            if(licensing.domain.toLowerCase() !== domain.trim().toLowerCase()){
                return res.status(403).json({
                    success: false,
                    message: 'Domain mismatch',
                    valid: false
                });
            }
            await licensing.update({ last_ping: new Date() });
            const isValid  = licensing.isValid();
            if(!isValid){
                let reason = 'License is not valid';
                if(licensing.status === 'terminated'){
                    reason = 'License has been terminated';
                }else 
                if(licensing.status === 'suspended'){
                    reason = 'License has been suspended';
                }else 
                if(licensing.plan !== 'lifetime' && licensing.expiry_on){
                    const today      = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expiryDate = new Date(licensing.expiry_on);
                    expiryDate.setHours(0, 0, 0, 0);
                    if(expiryDate < today){
                        reason = 'License has expired';
                    }
                }
                return res.status(403).json({
                    success: false,
                    message: reason,
                    valid: false,
                    status: licensing.status,
                    plan: licensing.plan,
                    expiry_on: licensing.expiry_on
                });
            }
            res.status(200).json({
                success: true,
                message: 'License is valid',
                valid: true,
                data: {
                    license_id: licensing.license_id,
                    client_name: licensing.client_name,
                    company_name: licensing.company_name,
                    plan: licensing.plan,
                    status: licensing.status,
                    expiry_on: licensing.expiry_on
                }
            });
        }catch(err){
            console.error('verifyLicense error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to verify license',
                valid: false
            });
        }
    }

};
module.exports = licensingController;