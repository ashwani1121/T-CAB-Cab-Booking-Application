const Settings = require('../models/settingsModel');
const fs       = require('fs');
const path     = require('path');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const settingsController = {
    // Save or update settings
    saveSettings: async (req, res) => {
        try{
            const {
                companyName,
                companyEmail,
                companyPhone,
                companyAddress,
                primaryGradientStart,
                primaryGradientEnd,
                secondaryGradientStart,
                secondaryGradientEnd,
                sidebarGradientStart,
                sidebarGradientEnd,
                gradientDirection,
                deleteLogo,
                deleteonboardImgOne,
                deleteonboardImgTwo,
                onboardOneTitle,
                onboardOneDescription,
                onboardTwoTitle,
                onboardTwoDescription,
                privacyPolicy,
                consentForm,
                fareAndChargesPolicy,
                reservationPolicy,
                role,
                commissionType,
                bookAnyVehicle,
                maxCancellationsPerDay,
                cancellationChargePercent,
                maxCancellationAmt,
                walletNegativeLimit,
                transferTimeFrom,
                transferTimeTo,
                complainAssignableRoles,
                complainEscalationRoles
            } = req.body;
            if(!['user', 'driver', 'admin'].includes(role)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified',
                });
            }
            const files        = req.files;
            const errors       = {};
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if(role !== 'admin'){
                // Company name and onboard fields are only for user and driver
                if(!companyName || !companyName.trim()){
                    errors.company_name = 'Company name is required';
                }
                if(!companyEmail){
                    errors.company_email = 'Company Email is required';
                }
                if(!companyPhone){
                    errors.company_phone = 'Company Phone is required';
                }
                if(!privacyPolicy || !privacyPolicy.trim()){
                    errors.privacy_policy = 'Privacy policy is required';
                }
                if(!consentForm || !consentForm.trim()){
                    errors.consent_form = 'Consent Form is required';
                }
                if(role === 'driver'){
                    if(!fareAndChargesPolicy || !fareAndChargesPolicy.trim()){
                        errors.fare_charges_policy = 'Fare & Charges Policy is required';
                    }
                }
            }else{
                // Admin also requires company info now
                if(!companyName || !companyName.trim()){
                    errors.company_name = 'Company name is required';
                }
                if(!companyEmail){
                    errors.company_email = 'Company Email is required';
                }
                if(!companyPhone){
                    errors.company_phone = 'Company Phone is required';
                }
                if(!transferTimeFrom){
                    errors.transfer_time_from = 'Transfer Time From is required';
                }
                if(!transferTimeTo){
                    errors.transfer_time_to = 'Transfer Time To is required';
                }
                if(!walletNegativeLimit){
                    errors.wallet_negative_limit = 'Wallet negative limit is required';
                }
                if(!complainAssignableRoles){
                    errors.complain_assignable_roles = 'Complaint Roles is required';
                }
                if(!complainEscalationRoles){
                    errors.complain_escalation_roles = 'Complaint Escalation Roles is required';
                }   
                if(!reservationPolicy || !reservationPolicy.trim()){
                    errors.reservation_policy = 'Reservation policy is required';
                }
            }
            if(!primaryGradientStart){
                errors.primary_gradient_start = 'Primary gradient start color is required';
            }
            if(!primaryGradientEnd){
                errors.primary_gradient_end = 'Primary gradient end color is required';
            }
            if(!secondaryGradientStart){
                errors.secondary_gradient_start = 'Secondary gradient start color is required';
            }
            if(!secondaryGradientEnd){
                errors.secondary_gradient_end = 'Secondary gradient end color is required';
            }
            if(role === 'admin'){
                if(!sidebarGradientStart){
                    errors.sidebar_gradient_start = 'Sidebar gradient start color is required';
                }
                if(!sidebarGradientEnd){
                    errors.sidebar_gradient_end = 'Sidebar gradient end color is required';
                } 
                if(!commissionType){
                    errors.commission_type = 'Commission type is required';
                }
                if(commissionType && !['percentage', 'fixed'].includes(commissionType)){
                    errors.commission_type = 'Commission type must be either "percentage" or "fixed"';
                }
                if(!bookAnyVehicle){ 
                    errors.bookAnyVehicle = 'bookAnyVehicle is required';
                }
                if(!maxCancellationsPerDay){
                    errors.maxCancellationsPerDay = 'Maximum Cancellation Per day is required';
                }
                if(!maxCancellationAmt){
                    errors.maxCancellationAmt = "Maximum Cancellation Amt is required";
                }
                if(!cancellationChargePercent){
                    errors.cancellationChargePercent = 'Cancellation Charge Percent is required';
                }
            }
            if(files?.logo && !allowedTypes.includes(files.logo[0].mimetype)){
                errors.logo = 'Logo must be a PNG, JPG, or JPEG file';
            }
            if(files?.onboardImgOne && !allowedTypes.includes(files.onboardImgOne[0].mimetype)){
                errors.onboard_img_one = 'Onboard image one must be a PNG, JPG, or JPEG file';
            }
            if(files?.onboardImgTwo && !allowedTypes.includes(files.onboardImgTwo[0].mimetype)){
                errors.onboard_img_two = 'Onboard image two must be a PNG, JPG, or JPEG file';
            }

            // Find existing settings for the specific role
            let settings        = await Settings.findOne({ where: { role } });
            const existingFiles = {
                logo: settings?.logo,
                onboardImgOne: settings?.onboard_img_one,
                onboardImgTwo: settings?.onboard_img_two
            };

            // Prepare update data
            const updateData = {
                role,
                company_name                : companyName || null,
                company_email               : companyEmail || null,
                company_phone               : companyPhone || null,
                company_address             : companyAddress || null,
                primary_gradient_start      : primaryGradientStart,
                primary_gradient_end        : primaryGradientEnd,
                secondary_gradient_start    : secondaryGradientStart,
                secondary_gradient_end      : secondaryGradientEnd,
                sidebar_gradient_start      : role === 'admin' ? sidebarGradientStart : null,
                sidebar_gradient_end        : role === 'admin' ? sidebarGradientEnd : null,
                commission_type             : role === 'admin' ? (commissionType || 'percentage') : 'percentage',
                book_any_vehicle            : bookAnyVehicle,
                max_cancellations_per_day   : maxCancellationsPerDay,
                cancellation_charge_percent : cancellationChargePercent,
                max_cancellation_amt        : maxCancellationAmt,
                wallet_negative_limit       : role === 'admin' ? walletNegativeLimit : null,
                transfer_time_from          : role === 'admin' ? transferTimeFrom : null,
                transfer_time_to            : role === 'admin' ? transferTimeTo : null,
                complain_assignable_roles   : role === 'admin' ? complainAssignableRoles : null,
                complain_escalation_roles   : role === 'admin' ? complainEscalationRoles : null, 
                gradient_direction          : gradientDirection || 'to right',
                onboard_title_one           : role !== 'admin' ? onboardOneTitle : null,
                onboard_desc_one            : role !== 'admin' ? onboardOneDescription : null,
                onboard_title_two           : role !== 'admin' ? onboardTwoTitle : null,
                onboard_desc_two            : role !== 'admin' ? onboardTwoDescription : null,
                privacy_policy              : role !== 'admin' ? privacyPolicy : null,
                consent_form                : role !== 'admin' ? consentForm : null,
                fare_charges_policy         : role === 'driver' ? fareAndChargesPolicy : null,
                reservation_policy          : role === 'admin' ? reservationPolicy : null 
            };

            // Handle file updates and deletions
            const deleteFile = (filename) => {
                if(!filename) return;
                const filePath = path.join(process.cwd(), 'uploads', filename);
                if(fs.existsSync(filePath)){
                    fs.unlinkSync(filePath);
                }
            };

            if(role !== 'admin'){
                // Validate onboard screen one - if any of image, title, or description is provided, all are required
                const hasOnboardOneImage = files?.onboardImgOne || (existingFiles.onboardImgOne && deleteonboardImgOne !== 'true');
                const hasOnboardOneTitle = onboardOneTitle && onboardOneTitle.trim();
                const hasOnboardOneDesc  = onboardOneDescription && onboardOneDescription.trim();
                if(hasOnboardOneImage || hasOnboardOneTitle || hasOnboardOneDesc){
                    if(!hasOnboardOneTitle){
                        errors.onboard_title_one = 'Title is required when image or description is provided';
                    }
                    if(!hasOnboardOneDesc){
                        errors.onboard_desc_one  = 'Description is required when image or title is provided';
                    }
                    if(!hasOnboardOneImage){
                        errors.onboard_img_one   = 'Image is required when title or description is provided';
                    }
                }

                // Validate onboard screen two
                const hasOnboardTwoImage = files?.onboardImgTwo || (existingFiles.onboardImgTwo && deleteonboardImgTwo !== 'true');
                const hasOnboardTwoTitle = onboardTwoTitle && onboardTwoTitle.trim();
                const hasOnboardTwoDesc  = onboardTwoDescription && onboardTwoDescription.trim();
                if(hasOnboardTwoImage || hasOnboardTwoTitle || hasOnboardTwoDesc){
                    if(!hasOnboardTwoTitle){
                        errors.onboard_title_two = 'Title is required when image or description is provided';
                    }
                    if(!hasOnboardTwoDesc){
                        errors.onboard_desc_two  = 'Description is required when image or title is provided';
                    }
                    if(!hasOnboardTwoImage){
                        errors.onboard_img_two   = 'Image is required when title or description is provided';
                    }
                }

                // Handle onboard images
                // Onboard Image One
                if(files?.onboardImgOne){
                    if(existingFiles.onboardImgOne){
                        deleteFile(existingFiles.onboardImgOne);
                    }
                    updateData.onboard_img_one = files.onboardImgOne[0].filename;
                }else 
                if(deleteonboardImgOne === 'true'){
                    if(existingFiles.onboardImgOne){
                        deleteFile(existingFiles.onboardImgOne);
                    }
                    updateData.onboard_img_one   = null;
                    updateData.onboard_title_one = null;
                    updateData.onboard_desc_one  = null;
                }

                // Clear onboard one fields if no image, title, or description
                if(!hasOnboardOneImage && !hasOnboardOneTitle && !hasOnboardOneDesc){
                    updateData.onboard_img_one   = null;
                    updateData.onboard_title_one = null;
                    updateData.onboard_desc_one  = null;
                    if(existingFiles.onboardImgOne && !files?.onboardImgOne && deleteonboardImgOne !== 'true'){
                        deleteFile(existingFiles.onboardImgOne);
                    }
                }

                // Onboard Image Two
                if(files?.onboardImgTwo){
                    if(existingFiles.onboardImgTwo){
                        deleteFile(existingFiles.onboardImgTwo);
                    }
                    updateData.onboard_img_two = files.onboardImgTwo[0].filename;
                }else 
                if(deleteonboardImgTwo === 'true'){
                    if(existingFiles.onboardImgTwo){
                        deleteFile(existingFiles.onboardImgTwo);
                    }
                    updateData.onboard_img_two   = null;
                    updateData.onboard_title_two = null;
                    updateData.onboard_desc_two  = null;
                }

                // Clear onboard two fields if no image, title, or description
                if(!hasOnboardTwoImage && !hasOnboardTwoTitle && !hasOnboardTwoDesc){
                    updateData.onboard_img_two   = null;
                    updateData.onboard_title_two = null;
                    updateData.onboard_desc_two  = null;
                    if(existingFiles.onboardImgTwo && !files?.onboardImgTwo && deleteonboardImgTwo !== 'true'){
                        deleteFile(existingFiles.onboardImgTwo);
                    }
                }
            }

            // Handle logo
            if(files?.logo){
                if(existingFiles.logo){
                    deleteFile(existingFiles.logo);
                }
                updateData.logo = files.logo[0].filename;
            }else 
            if(deleteLogo === 'true'){
                if(existingFiles.logo){
                    deleteFile(existingFiles.logo);
                }
                updateData.logo = null;
            }

            // If there are validation errors, return them
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            // Save or update settings in the database
            if(settings){
                await Settings.update(updateData, { where: { role } });
                settings = await Settings.findOne({ where: { role } });
            }else{
                settings = await Settings.create(updateData);
            }

            const responseData = {
                ...settings.dataValues,
                logo: settings.logo ? `${BASE_URL}/uploads/settings/${settings.logo}` : null,
                onboard_img_one: settings.onboard_img_one ? `${BASE_URL}/uploads/settings/${settings.onboard_img_one}` : null,
                onboard_img_two: settings.onboard_img_two ? `${BASE_URL}/uploads/settings/${settings.onboard_img_two}` : null,
                fare_charges_policy: settings.fare_charges_policy
            };
            res.status(200).json({
                success: true,
                message: 'Settings saved successfully',
                data   : responseData
            });
        }catch(err){
            console.error('Settings save error:', err);
            res.status(500).json({
                success: false,
                message: 'Somthing went wrong. please try again later.'
            });
        }
    },

    // Fetch settings
    getSettings: async (req, res) => {
        try{
            const { role } = req.query;
            if(!['user', 'driver', 'admin'].includes(role)){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified',
                });
            }
            const settings = await Settings.findOne({ where: { role } });
            if(!settings){
                return res.status(404).json({
                    success: false,
                    message: `No settings found for role: ${role}`,
                });
            }
            const responseData = {
                ...settings.dataValues,
                logo           : settings.logo ? `${BASE_URL}/uploads/settings/${settings.logo}` : null,
                onboard_img_one: settings.onboard_img_one ? `${BASE_URL}/uploads/settings/${settings.onboard_img_one}` : null,
                onboard_img_two: settings.onboard_img_two ? `${BASE_URL}/uploads/settings/${settings.onboard_img_two}` : null,
                fare_charges_policy: settings.fare_charges_policy
            };
            res.status(200).json({
                success: true,
                data: responseData
            });
        }catch(err){
            res.status(500).json({
                success: false,
                message: 'Somthing went wrong. please try again later.'
            });
        }
    },
};

module.exports = settingsController;