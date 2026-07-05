const Settings = require('../models/settingsModel');
const fs       = require('fs');
const path     = require('path');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const masterSettingsController = {
    
    // GET master settings
    getMasterSettings: async (req, res) => {
        try{
            let settings = await Settings.findOne({
                where: { role: 'admin' }
            });
            if(!settings){
                return res.status(500).json({
                    success: false,
                    message: 'Settings not found.'
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Master settings retrieved successfully',
                data: settings
            });
        }catch(error){
            console.error('Error fetching master settings:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve master settings',
                error: error.message
            });
        }
    },

    // POST/UPDATE master settings
    updateMasterSettings: async (req, res) => {
        try{
            const subscriptionActivate = req.body.subscriptionActivate;
            const otpProvider = req.body.otpProvider;
            const errors = {};
            if(!subscriptionActivate){
                errors.subscription_activate = 'Subscription activate field is required';
            }
            if(subscriptionActivate && !['yes', 'no'].includes(subscriptionActivate)){
                errors.subscription_activate = 'Subscription activate must be either "yes" or "no"';
            }
            // New OTP Provider validation
            if(!otpProvider){
                errors.otp_provider = 'OTP Provider is required';
            }
            if(otpProvider && !['msg91', 'combirds'].includes(otpProvider)){
                errors.otp_provider = 'Invalid OTP provider selected';
            }
            if(Object.keys(errors).length > 0){
                return res.status(422).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            // Find or create admin settings
            let settings = await Settings.findOne({
                where: { role: 'admin' }
            });
            if(!settings){
                return res.status(500).json({
                    success: false,
                    message: 'Settings not found.'
                });
            }else{
                await settings.update({
                    subscription_activate: subscriptionActivate,
                    otp_provider: otpProvider
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Master settings updated successfully',
                data: settings
            });
        }catch(error){
            console.error('Error updating master settings:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update master settings',
                error: error.message
            });
        }
    }
};
module.exports = masterSettingsController;