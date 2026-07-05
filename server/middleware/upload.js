const multer = require('multer');
const fs     = require('fs');
const path   = require('path');

// Create upload directory if it doesn't exist
const createUploadDir = (subDir) => {
    const uploadDir   = path.join(process.cwd(), 'uploads', subDir);
    if(!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};

// Factory function to create multer storage for a specific subdirectory
const createStorage = (subDir) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = createUploadDir(subDir);
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
            cb(null, `${Date.now()}-${sanitizedName}`);
        },
    });
};

// Advanced storage for driver registration with separate folders for each document type
const createDriverStorage = () => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            let subDir = 'drivers/general';
            // Organize files into specific folders based on field name
            if(file.fieldname.includes('aadhar')){
                subDir = 'drivers/aadhar';
            }else 
            if(file.fieldname.includes('license')){
                subDir = 'drivers/license';
            }else 
            if(file.fieldname.includes('vehicle_rc')){
                subDir = 'drivers/vehicle-rc';
            }else 
            if(file.fieldname === 'driver_face_image'){
                subDir = 'profile';
            }else 
            if(file.fieldname === 'vehicle_images'){
                subDir = 'drivers/vehicles';
            }
            const uploadDir = createUploadDir(subDir);
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const sanitizedName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
            const timestamp     = Date.now();
            const randomNum     = Math.round(Math.random() * 1E9);
            cb(null, `${file.fieldname}-${timestamp}-${randomNum}-${sanitizedName}`);
        },
    });
};

// File filter function to check file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        logo                   : ['image/png', 'image/jpeg', 'image/jpg'],
        onboardImgOne          : ['image/png', 'image/jpeg', 'image/jpg'],
        onboardImgTwo          : ['image/png', 'image/jpeg', 'image/jpg'],
        heroImage              : ['image/png', 'image/jpeg', 'image/jpg'],
        ad_0_images            : ['image/png', 'image/jpeg', 'image/jpg'],
        ad_1_images            : ['image/png', 'image/jpeg', 'image/jpg'],
        image                  : ['image/png', 'image/jpeg', 'image/jpg'],
        mapImage               : ['image/png', 'image/jpeg', 'image/jpg'],
        profile                : ['image/png', 'image/jpeg', 'image/jpg'],
        aadhar_front_image     : ['image/png', 'image/jpeg', 'image/jpg'],
        aadhar_back_image      : ['image/png', 'image/jpeg', 'image/jpg'],
        license_front_image    : ['image/png', 'image/jpeg', 'image/jpg'],
        license_back_image     : ['image/png', 'image/jpeg', 'image/jpg'],
        vehicle_rc_front_image : ['image/png', 'image/jpeg', 'image/jpg'],
        vehicle_rc_back_image  : ['image/png', 'image/jpeg', 'image/jpg'],
        driver_face_image      : ['image/png', 'image/jpeg', 'image/jpg'],
        vehicle_images         : ['image/png', 'image/jpeg', 'image/jpg'],
        ranking_image          : ['image/png', 'image/jpeg', 'image/jpg'],
        leaderboard_image      : ['image/png', 'image/jpeg', 'image/jpg'],
        animation              : ['application/json', 'image/gif'],
        start_meter_image      : ['image/png', 'image/jpeg', 'image/jpg'],
        end_meter_image        : ['image/png', 'image/jpeg', 'image/jpg'],
        attachments            : ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] 
    };
    if(allowedTypes[file.fieldname]?.includes(file.mimetype)){
        cb(null, true);
    }else{
        cb(
            new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes[file.fieldname]?.join(', ') || 'none'}`),
            false
        );
    }
};

// Create multer upload instances
const uploadMiddleware = {
    // Settings image upload (stores in uploads/settings)
    settingsUpload: multer({
        storage: createStorage('settings'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).fields([
        { name: 'logo', maxCount: 1 },
        { name: 'onboardImgOne', maxCount: 1 },
        { name: 'onboardImgTwo', maxCount: 1 },
    ]),

    // Promotion image upload (stores in uploads/trips)
    multipleImageUpload: multer({
        storage: createStorage('trips'), 
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).fields([
        { name: 'heroImage', maxCount: 1 },
        { name: 'ad_0_images', maxCount: 5 },
        { name: 'ad_1_images', maxCount: 5 },
    ]),

    // General image upload (stores in uploads/general)
    generalUpload: multer({
        storage: createStorage('general'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).any(),

    // Trip image upload (stores in uploads/trips)
    tripUpload: multer({
        storage: createStorage('trips'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).single('image'),

    // Profile image upload (stores in uploads/profile)
    profileUpload: multer({
        storage: createStorage('profile'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).single('profile'),

    // Vehicle type image upload (stores in uploads/vehicle-types)
    vehicleTypeUpload: multer({
        storage: createStorage('vehicle-types'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }).fields([
        { name: 'image', maxCount: 1 },  
        { name: 'mapImage', maxCount: 1 },     
        { name: 'animation', maxCount: 1 }
    ]),

    // Winners List Banners (stores in uploads/rankings)
    rankingsUpload: multer({
        storage: createStorage('rankings'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 },
    }).fields([
        { name: 'ranking_image', maxCount: 1 },
        { name: 'leaderboard_image', maxCount: 1 }
    ]),

    // Vehicle image upload (stores in uploads/vehicles)
    vehicleUpload: multer({
        storage: createStorage('vehicles'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }).single('image'),

    // Driver registration upload (stores in uploads/drivers/*)
    driverRegistrationUpload: multer({
        storage: createDriverStorage(),
        fileFilter,
        limits: { 
            fileSize: 5 * 1024 * 1024, // 5MB per file
            files: 12 // Maximum 12 files total (7 required docs + up to 5 vehicle images)
        },
    }).fields([
        { name: 'aadhar_front_image', maxCount: 1 },
        { name: 'aadhar_back_image', maxCount: 1 },
        { name: 'license_front_image', maxCount: 1 },
        { name: 'license_back_image', maxCount: 1 },
        { name: 'vehicle_rc_front_image', maxCount: 1 },
        { name: 'vehicle_rc_back_image', maxCount: 1 },
        { name: 'driver_face_image', maxCount: 1 },
        { name: 'vehicle_images', maxCount: 5 }
    ]),

    // Start meter reading upload only (for driver arrival)
    startMeterUpload: multer({
        storage: createStorage('meter-readings'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }).single('start_meter_image'),

    // End meter reading upload only (for ride completion)
    endMeterUpload: multer({
        storage: createStorage('meter-readings'),
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }).single('end_meter_image'),

    // Complaint attachment upload (stores in uploads/complaints/attachments)
    complaintAttachmentUpload: multer({
        storage: createStorage('complaints/attachments'),
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                'image/png', 'image/jpeg', 'image/jpg',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            if(allowedTypes.includes(file.mimetype)){
                cb(null, true);
            }else{
                cb(new Error('Invalid file type. Allowed: Images, PDF, DOC, DOCX'), false);
            }
        },
        limits: { 
            fileSize: 5 * 1024 * 1024, // 5MB per file
            files: 5 // Maximum 5 files
        },
    }).array('attachments', 5)
};

// Error handling middleware for Multer errors
const handleMulterError = (err, req, res, next) => {
    console.error('Multer error:', err);
    if(err instanceof multer.MulterError) {
        let message = 'File upload error';
        // Provide more specific error messages
        switch(err.code){
            case 'LIMIT_FILE_SIZE':
                message = 'File size too large. Maximum 5MB per file allowed.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files uploaded.';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields in the form.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = `Unexpected file field: ${err.field}`;
                break;
            default:
                message = err.message;
        }
        return res.status(400).json({
            success: false,
            message: message,
            errors: { [err.field || 'file']: err.message },
        });
    }else 
    if(err){
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error',
            errors: { [err.field || 'file']: err.message },
        });
    }
    next();
};

module.exports = { uploadMiddleware, handleMulterError };