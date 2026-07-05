const express             = require('express');
const router              = express.Router();
const fs                  = require('fs');
const path                = require('path');
const BASE_URL            = process.env.BASE_URL || 'http://localhost:5000';
const licensingController = require('../controllers/licensingController');

// Get all licenses with pagination, search, filters
router.get('/', licensingController.getLicensing);

// Get single license by database ID
router.get('/:id', licensingController.getLicensingById);

// Get single license by license_id (LIC-IND-2025-0001)
router.get('/by-license-id/:license_id', async (req, res) => {
    try{
        const { license_id } = req.params;
        const { Licensing }  = require('../models');
        const licensing = await Licensing.findOne({
            where: { license_id }
        });
        if(!licensing){
            return res.status(404).json({
                success: false,
                message: 'License not found'
            });
        }
        res.status(200).json({
            success: true,
            data: licensing
        });
    }catch(error){
        console.error('Get license by license_id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch license'
        });
    }
});

// Create new license
router.post('/', licensingController.createLicensing);

// Update existing license
router.put('/:id', licensingController.updateLicensing);

// Terminate license (soft delete)
router.delete('/:id', licensingController.deleteLicensing);

// Suspend a license temporarily
router.post('/:id/suspend', async (req, res) => {
    try {
        const { id } = req.params;
        const { Licensing } = require('../models');
        
        const licensing = await Licensing.findByPk(id);
        
        if (!licensing) {
            return res.status(404).json({
                success: false,
                message: 'License not found'
            });
        }

        await licensing.update({ 
            status: 'suspended',
            updated_at: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'License suspended successfully'
        });
    } catch (error) {
        console.error('Suspend license error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to suspend license'
        });
    }
});

// Reactivate a suspended license
router.post('/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        const { Licensing } = require('../models');
        
        const licensing = await Licensing.findByPk(id);
        
        if (!licensing) {
            return res.status(404).json({
                success: false,
                message: 'License not found'
            });
        }

        // Don't allow activating terminated licenses
        if (licensing.status === 'terminated') {
            return res.status(400).json({
                success: false,
                message: 'Cannot activate terminated license'
            });
        }

        await licensing.update({ 
            status: 'active',
            updated_at: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'License activated successfully'
        });
    } catch (error) {
        console.error('Activate license error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate license'
        });
    }
});

module.exports = router;