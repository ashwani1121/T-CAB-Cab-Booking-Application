const { BankDetails, User, Op } = require('../../models');
const easebuzzController        = require('./easebuzzController'); 
const bankDetailsController     = {

    // Get all Bank Details with pagination, search, and filters
    getBankDetails: async (req, res) => {
        try{
            const {
                page    = 1,
                limit   = 10,
                search  = '',
                status  = '',
                type    = '',
                user_id = '',
                sort    = 'created_at',
                order   = 'desc',
            } = req.query;

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            
            const validSortFields = ['type', 'status', 'created_at', 'updated_at', 'is_primary'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            const where = {};
            if(search){
                where[Op.or] = [
                    { account_holder_name: { [Op.like]: `%${search}%` } },
                    { account_number: { [Op.like]: `%${search}%` } },
                    { upi_id: { [Op.like]: `%${search}%` } },
                    { bank_name: { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            if(type && ['account', 'upi'].includes(type)){
                where.type = type;
            }
            if(user_id){
                where.user_id = Number(user_id);
            }
            
            const { rows, count } = await BankDetails.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
            });
            res.status(200).json({
                success    : true,
                data       : rows,
                total      : count,
                page       : pageNum,
                limit      : limitNum,
                totalPages : Math.ceil(count / limitNum)
            });
        }catch(err){
            console.error('getBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get Bank Details by ID
    getBankDetailsById: async (req, res) => {
        try{
            const { id }     = req.params;
            const bankDetail = await BankDetails.findOne({
                where: { id },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ]
            });
            if(!bankDetail){
                return res.status(404).json({
                    success: false,
                    message: 'Bank details not found',
                });
            }
            res.status(200).json({
                success: true,
                data: bankDetail,
            });
        }catch(err){
            console.error('getBankDetailsById error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Get user's bank details with pagination and filters
    getUserBankDetails: async (req, res) => {
        try{
            const { user_id } = req.params;
            const {
                page    = 1,
                limit   = 10,
                search  = '',
                status  = '',
                type    = '',
                sort    = 'created_at',
                order   = 'desc',
            } = req.query;

            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 100);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters',
                });
            }
            
            const validSortFields = ['type', 'status', 'created_at', 'updated_at', 'is_primary'];
            const validOrder      = ['asc', 'desc'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = validOrder.includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';
            const where = { user_id: Number(user_id) };
            if(search){
                where[Op.or] = [
                    { account_holder_name : { [Op.like]: `%${search}%` } },
                    { account_number      : { [Op.like]: `%${search}%` } },
                    { upi_id              : { [Op.like]: `%${search}%` } },
                    { bank_name           : { [Op.like]: `%${search}%` } }
                ];
            }
            if(status === '1' || status === '0'){
                where.status = Number(status);
            }
            if(type && ['account', 'upi'].includes(type)){
                where.type = type;
            }
            
            const { rows, count } = await BankDetails.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
            });
            res.status(200).json({
                success    : true,
                data       : rows,
                total      : count,
                page       : pageNum,
                limit      : limitNum,
                totalPages : Math.ceil(count / limitNum)
            });
        }catch(err){
            console.error('getUserBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // ============================================================
    // STEP 1: VERIFY BANK ACCOUNT DETAILS
    // ============================================================
    verifyBankAccount: async (req, res) => {
        try{
            const {
                type,
                account_number,
                ifsc_code,
                upi_id
            } = req.body;
            // Basic Validation
            if(!type || !['account', 'upi'].includes(type)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid type is required (account or upi)',
                });
            }
            // Handle Bank Account Verification
            if(type === 'account'){
                if(!account_number || !ifsc_code){
                    return res.status(400).json({
                        success: false,
                        message: 'Account number and IFSC code are required for bank account',
                    });
                }
                // Validate account number format (9-18 digits)
                if(!/^[0-9]{9,18}$/.test(account_number.toString().trim())){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid account number format (9-18 digits required)',
                    });
                }
                // Validate IFSC code format
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if(!ifscRegex.test(ifsc_code.trim().toUpperCase())){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid IFSC code format (e.g., SBIN0001234)',
                    });
                }
                // Verify with Easebuzz
                try{
                    const verificationResult = await easebuzzController.verifyBankAccountInternal({
                        account_number      : account_number.toString().trim(),
                        account_ifsc        : ifsc_code.trim().toUpperCase()
                    });
                    if(!verificationResult.success || !verificationResult.verified){
                        return res.status(400).json({
                            success : false,
                            message : verificationResult.message || 'Bank account verification failed',
                            data    : verificationResult.data || null
                        });
                    }
                    // Check name match
                    if(!verificationResult.data?.name_match?.is_acceptable){
                        return res.status(400).json({
                            success : false,
                            message : 'Account holder name does not match with bank records',
                            data    : {
                                expected_name        : verificationResult.data.name_match.expected_name,
                                bank_registered_name : verificationResult.data.name_match.bank_registered_name,
                                match_percentage     : verificationResult.data.name_match.percentage,
                                message              : verificationResult.data.name_match.message
                            }
                        });
                    }
                    // Return verification data for user confirmation
                    return res.status(200).json({
                        success     : true,
                        message     : 'Bank account verified successfully. Please review and confirm the details.',
                        verified    : true,
                        data        : {
                            type                    : 'account',
                            entered_details         : {
                                account_number      : account_number.toString().trim(),
                                ifsc_code           : ifsc_code.trim().toUpperCase()
                            },
                            verified_details        : {
                                bank_name           : verificationResult.data.bank_name,
                                branch_name         : verificationResult.data.branch_name,
                                account_holder_name : verificationResult.data.account_holder_name,
                                name_match          : verificationResult.data.name_match,
                                account_number_masked: verificationResult.data.account_number_masked
                            },
                            // Include this token for the next step
                            verification_token      : Buffer.from(JSON.stringify({
                                account_number,
                                ifsc_code: ifsc_code.trim().toUpperCase(),
                                account_holder_name: verificationResult.data.account_holder_name.trim(),
                                bank_name: verificationResult.data.bank_name,
                                verified_at: new Date().toISOString()
                            })).toString('base64')
                        }
                    });
                }catch(verifyError){
                    console.error('Bank verification error:', verifyError);
                    return res.status(500).json({
                        success : false,
                        message : 'Failed to verify bank account. Please try again.',
                        error   : process.env.NODE_ENV === 'development' ? verifyError.message : undefined
                    });
                }
            }
            // Handle UPI Verification
            if(type === 'upi'){
                if(!upi_id){
                    return res.status(400).json({
                        success: false,
                        message: 'UPI ID is required for UPI payment method',
                    });
                }
                const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
                if(!upiRegex.test(upi_id.trim())){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid UPI ID format (e.g., username@bankname)',
                    });
                }
                // For UPI, just validate format and return success
                return res.status(200).json({
                    success     : true,
                    message     : 'UPI ID format is valid. Please confirm to save.',
                    verified    : true,
                    data        : {
                        type            : 'upi',
                        entered_details : {
                            upi_id              : upi_id.trim()
                        },
                        verification_token  : Buffer.from(JSON.stringify({
                            upi_id: upi_id.trim(),
                            account_holder_name: verificationResult.data.account_holder_name.trim(),
                            verified_at: new Date().toISOString()
                        })).toString('base64')
                    }
                });
            }
        }catch(err){
            console.error('verifyBankAccount error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // ============================================================
    // STEP 2: CREATE BANK DETAILS 
    // ============================================================
    createBankDetails: async (req, res) => {
        try{
            const {
                verification_token,
                is_primary
            } = req.body;
            // Validate required fields
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!userId){
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
            }
            if(!verification_token){
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required. Please verify account details first.',
                });
            }
            // Check if user exists
            const user = await User.findByPk(userId);
            if(!user){
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }
            // Decode verification token
            let verifiedData;
            try{
                const decodedToken = Buffer.from(verification_token, 'base64').toString('utf-8');
                verifiedData       = JSON.parse(decodedToken);
                const verifiedAt   = new Date(verifiedData.verified_at);
                const now          = new Date();
                const diffMinutes  = (now - verifiedAt) / (1000 * 60);
                if(diffMinutes > 30){
                    return res.status(400).json({
                        success: false,
                        message: 'Verification token has expired. Please verify again.',
                    });
                }
            }catch(tokenError){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification token',
                });
            }
            // Determine type from verified data
            const type = verifiedData.account_number ? 'account' : 'upi';
            // Check for duplicate account
            const duplicateWhere = { userId };
            if(type === 'account'){
                duplicateWhere.account_number = verifiedData.account_number.toString().trim();
            }else{
                duplicateWhere.upi_id = verifiedData.upi_id.trim();
            }
            const existingDetail = await BankDetails.findOne({ where: duplicateWhere });
            if(existingDetail){
                return res.status(400).json({
                    success: false,
                    message: type === 'account' 
                        ? 'This bank account is already added to your profile' 
                        : 'This UPI ID is already added to your profile',
                });
            }
            // If setting as primary, remove primary flag from other records
            if(is_primary){
                await BankDetails.update(
                    { is_primary: 0 },
                    { where: { userId } }
                );
            }
            // Create bank details
            const bankDetail = await BankDetails.create({
                user_id             : userId,
                type,
                account_holder_name : verifiedData.account_holder_name.trim(),
                account_number      : type === 'account' ? verifiedData.account_number.toString().trim() : null,
                ifsc_code           : type === 'account' ? verifiedData.ifsc_code.trim().toUpperCase() : null,
                bank_name           : type === 'account' ? verifiedData.bank_name : null,
                upi_id              : type === 'upi' ? verifiedData.upi_id.trim() : null,
                is_primary          : is_primary ? 1 : 0,
                status              : 1
            });
            res.status(201).json({
                success : true,
                message : 'Bank details saved successfully',
                data    : bankDetail
            });
        }catch(err){
            console.error('createBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Update Bank Details 
    updateBankDetails: async (req, res) => {
        try{
            const { id } = req.params;
            const {
                verification_token,
                is_primary
            } = req.body;
            const bankDetail = await BankDetails.findByPk(id);
            if(!bankDetail){
                return res.status(404).json({
                    success: false,
                    message: 'Bank details not found',
                });
            }
            // If verification_token is provided, update the account details
            if(verification_token){
                let verifiedData;
                try{
                    const decodedToken = Buffer.from(verification_token, 'base64').toString('utf-8');
                    verifiedData       = JSON.parse(decodedToken);
                    const verifiedAt   = new Date(verifiedData.verified_at);
                    const now          = new Date();
                    const diffMinutes  = (now - verifiedAt) / (1000 * 60);
                    if(diffMinutes > 30){
                        return res.status(400).json({
                            success: false,
                            message: 'Verification token has expired. Please verify again.',
                        });
                    }
                }catch(tokenError){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid verification token',
                    });
                }
                const type = verifiedData.account_number ? 'account' : 'upi';
                // Update based on type
                if(type === 'account'){
                    await bankDetail.update({
                        type                : 'account',
                        account_holder_name : verifiedData.account_holder_name.trim(),
                        account_number      : verifiedData.account_number.toString().trim(),
                        ifsc_code           : verifiedData.ifsc_code.trim().toUpperCase(),
                        bank_name           : verifiedData.bank_name,
                        upi_id              : null
                    });
                }else{
                    await bankDetail.update({
                        type                : 'upi',
                        account_holder_name : verifiedData.account_holder_name.trim(),
                        upi_id              : verifiedData.upi_id.trim(),
                        account_number      : null,
                        ifsc_code           : null,
                        bank_name           : null
                    });
                }
            }
            // Update other fields if provided
            const updateData = {};
            if(is_primary !== undefined) updateData.is_primary = is_primary ? 1 : 0;
            if(Object.keys(updateData).length > 0){
                // If setting as primary, remove primary flag from other records
                if(is_primary && !bankDetail.is_primary){
                    await BankDetails.update(
                        { is_primary: 0 },
                        { where: { user_id: bankDetail.user_id, id: { [Op.ne]: id } } }
                    );
                }
                await bankDetail.update(updateData);
            }
            await bankDetail.reload();
            res.status(200).json({
                success : true,
                message : 'Bank details updated successfully',
                data    : bankDetail
            });
        }catch(err){
            console.error('updateBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Delete Bank Details (hard delete)
    deleteBankDetails: async (req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const { id }     = req.params;
            const bankDetail = await BankDetails.findByPk(id);
            if(!bankDetail){
                return res.status(404).json({
                    success: false,
                    message: 'Bank details not found',
                });
            }
            await bankDetail.destroy();
            res.status(200).json({
                success: true,
                message: 'Bank details deleted successfully',
            });
        }catch(err){
            console.error('deleteBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    },

    // Set Primary Bank Details
    primaryBankDetails: async (req, res) => {
        try{
            const { id } = req.params;
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            if(!id || isNaN(parseInt(id))){
                return res.status(400).json({
                    success: false,
                    message: 'Valid bank details ID is required'
                });
            }
            const bankDetail = await BankDetails.findOne({
                where: { id },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'mobile']
                    }
                ]
            });
            if(!bankDetail){
                return res.status(404).json({
                    success: false,
                    message: 'Bank details not found',
                });
            }
            if(userId && bankDetail.user_id !== userId){
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You do not have permission to modify this bank detail'
                });
            }
            if(bankDetail.status !== 1){
                return res.status(400).json({
                    success: false,
                    message: 'Cannot set inactive bank details as primary'
                });
            }
            if(bankDetail.is_primary === 1){
                return res.status(200).json({
                    success: true,
                    message: 'This bank detail is already set as primary',
                    data: bankDetail
                });
            }
            await BankDetails.update(
                { is_primary: 0 },
                { 
                    where: { 
                        user_id: bankDetail.user_id,
                        id: { [Op.ne]: id }
                    } 
                }
            );
            await bankDetail.update({ is_primary: 1 });
            await bankDetail.reload();
            res.status(200).json({
                success: true,
                message: 'Bank details set as primary successfully',
                data: bankDetail
            });
        }catch(err){
            console.error('primaryBankDetails error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
            });
        }
    }
};
module.exports = bankDetailsController;