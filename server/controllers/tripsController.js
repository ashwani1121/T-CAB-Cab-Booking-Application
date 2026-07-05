const Trips           = require('../models/tripsModel');
const Settings        = require('../models/settingsModel');
const fs              = require('fs');
const path            = require('path');
const BASE_URL        = process.env.BASE_URL || 'http://localhost:5000';
const tripsController = {

    // Get all trips
    getTrips: async(req, res) => {
        try{
            const trips = await Trips.findAll();
            if(!trips || trips.length === 0){
                return res.status(200).json({
                    success: true,
                    message: 'No trips found',
                    data: [],
                });
            }
            const responseData = trips.map((trip) => ({
                ...trip.dataValues,
                image: trip.image ? `${BASE_URL}/uploads/trips/${trip.image}` : null,
            }));
            res.status(200).json({
                success: true,
                data: responseData,
            });
        }catch(err){
            console.error('getTrips error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Update a trip
    updateTrip: async(req, res) => {
        try{
            const { id }   = req.params;
            const { trip } = req.body;
            const errors   = {};
            if(!trip || trip.trim() === ''){
                errors.trip = 'Trip name is required';
            }
            const existingTrip = await Trips.findByPk(id);
            if(!existingTrip){
                return res.status(404).json({
                    success: false,
                    message: 'Trip not found',
                });
            }
            if(!existingTrip.image && !req.file){
                errors.image = 'Trip image is required';
            }
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors : errors,
                });
            }
            const updateData = { trip };
            if(req.file){
                if(existingTrip.image){
                    const oldImagePath = path.join(__dirname, '../uploads/trips', existingTrip.image);
                    if(fs.existsSync(oldImagePath)){
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.image = req.file.filename;
            }
            await existingTrip.update(updateData);
            const updatedTrip  = await Trips.findByPk(id);
            const responseData = {
                ...updatedTrip.dataValues,
                image: updatedTrip.image ? `${BASE_URL}/uploads/trips/${updatedTrip.image}` : null,
            };
            res.status(200).json({
                success: true,
                message: 'Trip updated successfully',
                data: responseData,
            });
        }catch(err){
            console.error('updateTrip error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    // Get all promotions
    getPromotion: async (req, res) => {
        try{
            const settings = await Settings.findOne({ where: { role: 'user' } });
            if(!settings){
                return res.status(200).json({
                    success: true,
                    message: 'No promotions data found',
                    data: null,
                });
            }
            let ad1Images         = [];
            let ad2Images         = [];
            let ad1ImagesMetadata = [];
            let ad2ImagesMetadata = [];
            try{
                ad1Images         = typeof settings.ad1_images === 'string' ? JSON.parse(settings.ad1_images) : settings.ad1_images;
                ad2Images         = typeof settings.ad2_images === 'string' ? JSON.parse(settings.ad2_images) : settings.ad2_images;
                ad1ImagesMetadata = typeof settings.ad1_images_metadata === 'string' ? JSON.parse(settings.ad1_images_metadata) : settings.ad1_images_metadata;
                ad2ImagesMetadata = typeof settings.ad2_images_metadata === 'string' ? JSON.parse(settings.ad2_images_metadata) : settings.ad2_images_metadata;
            }catch(err){
                ad1Images         = [];
                ad2Images         = [];
                ad1ImagesMetadata = [];
                ad2ImagesMetadata = [];
            }
            // Ensure arrays are valid
            ad1Images             = Array.isArray(ad1Images) ? ad1Images : [];
            ad2Images             = Array.isArray(ad2Images) ? ad2Images : [];
            ad1ImagesMetadata     = Array.isArray(ad1ImagesMetadata) ? ad1ImagesMetadata : [];
            ad2ImagesMetadata     = Array.isArray(ad2ImagesMetadata) ? ad2ImagesMetadata : [];
            const responseData    = {
                hero: {
                    title: settings.hero_title || '',
                    image: settings.hero_image
                        ? `${BASE_URL}/uploads/trips/${settings.hero_image}`
                        : null,
                    isTextEnabled: settings.hero_is_text_enabled ?? true,
                },
                ads: [
                    {
                        images: ad1Images.map((img) => `${BASE_URL}/uploads/trips/${img}`),
                        buttonText: settings.ad1_button_text || '',
                        link: settings.ad1_link || '',
                        imageTitle: settings.ad1_image_title || '',
                        isImageTitleEnabled: settings.ad1_is_image_title_enabled ?? true,
                        isButtonEnabled: settings.ad1_is_button_enabled ?? true,
                        metadata: ad1ImagesMetadata.map((meta) => ({
                            name: meta.name,
                            size: Number(meta.size) || 0,
                        })),
                    },
                    {
                        images: ad2Images.map((img) => `${BASE_URL}/uploads/trips/${img}`),
                        buttonText: settings.ad2_button_text || '',
                        link: settings.ad2_link || '',
                        imageTitle: settings.ad2_image_title || '',
                        isImageTitleEnabled: settings.ad2_is_image_title_enabled ?? true,
                        isButtonEnabled: settings.ad2_is_button_enabled ?? true,
                        metadata: ad2ImagesMetadata.map((meta) => ({
                            name: meta.name,
                            size: Number(meta.size) || 0,
                        })),
                    },
                ],
            };
            res.status(200).json({
                success: true,
                data: responseData,
            });
        }catch(err){
            console.error('getPromotion error:', err);
            res.status(500).json({
                success: false,
                message: 'Something went wrong. Please try again later!',
                errors : { server: err.message },
            });
        }
    },

    updatePromotion: async (req, res) => {
        try{
            const {
                heroTitle,
                heroIsTextEnabled,
                ad_0_buttonText,
                ad_0_link,
                ad_0_imageTitle,
                ad_0_isImageTitleEnabled,
                ad_0_existingImages,
                ad_0_isButtonEnabled,
                ad_1_buttonText,
                ad_1_link,
                ad_1_imageTitle,
                ad_1_isImageTitleEnabled,
                ad_1_existingImages,
                ad_1_isButtonEnabled,
            } = req.body;
            const errors = {};

            // Validation: Banner title is required if heroIsTextEnabled is true
            if(heroIsTextEnabled === 'true' && (!heroTitle || heroTitle.trim() === '')){
                errors.hero_title = 'Banner title is required when text is enabled';
            }

            // Validation: Ad title is required for ad_0 if isImageTitleEnabled is true
            if(ad_0_isImageTitleEnabled === 'true' && (!ad_0_imageTitle || ad_0_imageTitle.trim() === '')){
                errors.ad_0_imageTitle = 'Ad title is required when title is enabled for Ad 1';
            }

            // Validation: Ad title is required for ad_1 if isImageTitleEnabled is true
            if (ad_1_isImageTitleEnabled === 'true' && (!ad_1_imageTitle || ad_1_imageTitle.trim() === '')){
                errors.ad_1_imageTitle = 'Ad title is required when title is enabled for Ad 2';
            }

            // Validation: Button text and link for ad_0
            if(ad_0_isButtonEnabled === 'true' || (ad_0_buttonText && ad_0_buttonText.trim() !== '')){
                if(!ad_0_buttonText || ad_0_buttonText.trim() === ''){
                    errors.ad_0_buttonText = 'Button text is required when button is enabled or button text is provided';
                }
                if(!ad_0_link || ad_0_link.trim() === ''){
                    errors.ad_0_link = 'Button link is required when button is enabled or button text is provided';
                }
            }

            // Validation: Button text and link for ad_1
            if(ad_1_isButtonEnabled === 'true' || (ad_1_buttonText && ad_1_buttonText.trim() !== '')){
                if(!ad_1_buttonText || ad_1_buttonText.trim() === ''){
                    errors.ad_1_buttonText = 'Button text is required when button is enabled or button text is provided';
                }
                if(!ad_1_link || ad_1_link.trim() === ''){
                    errors.ad_1_link = 'Button link is required when button is enabled or button text is provided';
                }
            }

            // Check if settings exist and have a hero_image
            let settings = await Settings.findOne({ where: { role: 'user' } });
            if(!req.files || !req.files.heroImage){
                if(!settings || !settings.hero_image){
                    errors.hero_image = 'Banner image is required';
                }
            }else if(req.files && req.files.heroImage && !['image/png', 'image/jpeg', 'image/jpg'].includes(req.files.heroImage[0].mimetype)) {
                errors.hero_image = 'Invalid image format. Only PNG, JPEG, or JPG allowed';
            }

            // Validate ad images if provided
            if(req.files && req.files.ad_0_images){
                req.files.ad_0_images.forEach((file) => {
                    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)){
                        errors.ad_0_images = 'Invalid image format for ad 1. Only PNG, JPEG, or JPG allowed';
                    }
                    if (file.size <= 0) {
                        errors.ad_0_images = 'Invalid file size for ad 1 images';
                    }
                });
            }
            if(req.files && req.files.ad_1_images){
                req.files.ad_1_images.forEach((file) => {
                    if(!['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)){
                        errors.ad_1_images = 'Invalid image format for ad 2. Only PNG, JPEG, or JPG allowed';
                    }
                    if(file.size <= 0){
                        errors.ad_1_images = 'Invalid file size for ad 2 images';
                    }
                });
            }

            // Validate existing images
            let ad0ParsedExisting = [];
            if(ad_0_existingImages){
                try {
                    ad0ParsedExisting = Array.isArray(ad_0_existingImages) ? ad_0_existingImages : JSON.parse(ad_0_existingImages);
                    ad0ParsedExisting.forEach((item) => {
                        if (!item.name || Number(item.size) < 0) {
                            errors.ad_0_images = 'Invalid metadata for existing ad 1 images';
                        }
                    });
                } catch (e) {
                    errors.ad_0_images = 'Invalid format for existing ad 1 images';
                }
            }
            let ad1ParsedExisting = [];
            if(ad_1_existingImages){
                try{
                    ad1ParsedExisting = Array.isArray(ad_1_existingImages) ? ad1ParsedExisting : JSON.parse(ad_1_existingImages);
                    ad1ParsedExisting.forEach((item) => {
                        if(!item.name || Number(item.size) < 0){
                            errors.ad_1_images = 'Invalid metadata for existing ad 2 images';
                        }
                    });
                }catch(e){
                    errors.ad_1_images = 'Invalid format for existing ad 2 images';
                }
            }

            // Check if at least one image exists for ad_0 (either existing or new)
            const hasAd0Images = (ad0ParsedExisting && ad0ParsedExisting.length > 0) || (req.files && req.files.ad_0_images && req.files.ad_0_images.length > 0);
            if(!hasAd0Images){
                errors.ad_0_images = 'At least one image is required for Ad 1';
            }

            // Check if at least one image exists for ad_1 (either existing or new)
            const hasAd1Images = (ad1ParsedExisting && ad1ParsedExisting.length > 0) || (req.files && req.files.ad_1_images && req.files.ad_1_images.length > 0);
            if(!hasAd1Images){
                errors.ad_1_images = 'At least one image is required for Ad 2';
            }

            // Return errors if any validation fails
            if(Object.keys(errors).length > 0){
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }

            // Rest of the code remains unchanged
            if(!settings){
                settings = await Settings.create({
                    role: 'user',
                    company_name: 'Default Company',
                    gradient_direction: 'to right',
                    primary_gradient_start: '#3B82F6',
                    primary_gradient_end: '#1E3A8A',
                    secondary_gradient_start: '#10B981',
                    secondary_gradient_end: '#047857',
                    sidebar_gradient_start: '#6B7280',
                    sidebar_gradient_end: '#4B5563',
                    hero_title: heroTitle || '',
                    hero_is_text_enabled: heroIsTextEnabled === 'true',
                    ad1_images: [],
                    ad2_images: [],
                    ad1_images_metadata: [],
                    ad2_images_metadata: [],
                });
            }

            const updateData = {
                hero_title: heroTitle || '',
                hero_is_text_enabled: heroIsTextEnabled === 'true',
                ad1_button_text: ad_0_buttonText || null,
                ad1_link: ad_0_link || null,
                ad1_image_title: ad_0_imageTitle || null,
                ad1_is_image_title_enabled: ad_0_isImageTitleEnabled === 'true',
                ad1_is_button_enabled: ad_0_isButtonEnabled === 'true',
                ad2_button_text: ad_1_buttonText || null,
                ad2_link: ad_1_link || null,
                ad2_image_title: ad_1_imageTitle || null,
                ad2_is_image_title_enabled: ad_1_isImageTitleEnabled === 'true',
                ad2_is_button_enabled: ad_1_isButtonEnabled === 'true',
            };

            // Handle hero image
            if(req.files && req.files.heroImage){
                if(settings.hero_image){
                    const oldImagePath = path.join(__dirname, '../uploads/trips', settings.hero_image);
                    if(fs.existsSync(oldImagePath)){
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.hero_image = req.files.heroImage[0].filename;
            }

            // Handle ad_0_images (Ad 1)
            if(req.files && req.files.ad_0_images || ad_0_existingImages){
                let existingImages = [];
                let existingMetadata = Array.isArray(settings.ad1_images_metadata) ? settings.ad1_images_metadata : [];
                if(ad_0_existingImages){
                    existingImages = ad0ParsedExisting.map((item) => item.name);
                    existingMetadata = ad0ParsedExisting.map((item) => ({
                        name: item.name,
                        size: Number(item.size) || 0,
                    }));
                }
                const newImages = req.files && req.files.ad_0_images ? req.files.ad_0_images.map((file) => file.filename) : [];
                const newMetadata = req.files && req.files.ad_0_images ? req.files.ad_0_images.map((file) => ({
                    name: file.filename,
                    size: file.size,
                })) : [];
                const combinedImages = [...existingImages, ...newImages].slice(0, 5);
                const combinedMetadata = [...existingMetadata, ...newMetadata].slice(0, 5);
                if(Array.isArray(settings.ad1_images)) {
                    settings.ad1_images.forEach((oldImage) => {
                        if(!combinedImages.includes(oldImage)) {
                            const oldImagePath = path.join(__dirname, '../uploads/trips', oldImage);
                            if (fs.existsSync(oldImagePath)) {
                                fs.unlinkSync(oldImagePath);
                            }
                        }
                    });
                }
                updateData.ad1_images = combinedImages;
                updateData.ad1_images_metadata = combinedMetadata;
            }else{
                if(Array.isArray(settings.ad1_images)){
                    settings.ad1_images.forEach((oldImage) => {
                        const oldImagePath = path.join(__dirname, '../uploads/trips', oldImage);
                        if(fs.existsSync(oldImagePath)){
                            fs.unlinkSync(oldImagePath);
                        }
                    });
                }
                updateData.ad1_images = [];
                updateData.ad1_images_metadata = [];
            }

            // Handle ad_1_images (Ad 2)
            if(req.files && req.files.ad_1_images || ad_1_existingImages){
                let existingImages = [];
                let existingMetadata = Array.isArray(settings.ad2_images_metadata) ? settings.ad2_images_metadata : [];
                if(ad_1_existingImages){
                    existingImages = ad1ParsedExisting.map((item) => item.name);
                    existingMetadata = ad1ParsedExisting.map((item) => ({
                        name: item.name,
                        size: Number(item.size) || 0,
                    }));
                }
                const newImages = req.files && req.files.ad_1_images ? req.files.ad_1_images.map((file) => file.filename) : [];
                const newMetadata = req.files && req.files.ad_1_images ? req.files.ad_1_images.map((file) => ({
                    name: file.filename,
                    size: file.size,
                })) : [];
                const combinedImages = [...existingImages, ...newImages].slice(0, 5);
                const combinedMetadata = [...existingMetadata, ...newMetadata].slice(0, 5);
                if(Array.isArray(settings.ad2_images)){
                    settings.ad2_images.forEach((oldImage) => {
                        if(!combinedImages.includes(oldImage)){
                            const oldImagePath = path.join(__dirname, '../uploads/trips', oldImage);
                            if(fs.existsSync(oldImagePath)){
                                fs.unlinkSync(oldImagePath);
                            }
                        }
                    });
                }
                updateData.ad2_images = combinedImages;
                updateData.ad2_images_metadata = combinedMetadata;
            }else{
                if(Array.isArray(settings.ad2_images)){
                    settings.ad2_images.forEach((oldImage) => {
                        const oldImagePath = path.join(__dirname, '../uploads/trips', oldImage);
                        if(fs.existsSync(oldImagePath)){
                            fs.unlinkSync(oldImagePath);
                        }
                    });
                }
                updateData.ad2_images = [];
                updateData.ad2_images_metadata = [];
            }

            // Validate updateData
            if(!Array.isArray(updateData.ad1_images)){
                console.error('Invalid ad1_images:', updateData.ad1_images);
                updateData.ad1_images = [];
            }
            if(!Array.isArray(updateData.ad2_images)){
                console.error('Invalid ad2_images:', updateData.ad2_images);
                updateData.ad2_images = [];
            }
            if(!Array.isArray(updateData.ad1_images_metadata)){
                console.error('Invalid ad1_images_metadata:', updateData.ad1_images_metadata);
                updateData.ad1_images_metadata = [];
            }
            if(!Array.isArray(updateData.ad2_images_metadata)){
                console.error('Invalid ad2_images_metadata:', updateData.ad2_images_metadata);
                updateData.ad2_images_metadata = [];
            }

            await settings.update(updateData);
            const responseData = {
                hero_title: settings.hero_title,
                hero_image: settings.hero_image ? `${BASE_URL}/uploads/trips/${settings.hero_image}` : null,
                hero_is_text_enabled: settings.hero_is_text_enabled,
                ad1: {
                    images: Array.isArray(settings.ad1_images) ? settings.ad1_images.map((img) => `${BASE_URL}/uploads/trips/${img}`) : [],
                    button_text: settings.ad1_button_text || '',
                    link: settings.ad1_link || '',
                    image_title: settings.ad1_image_title || '',
                    is_image_title_enabled: settings.ad1_is_image_title_enabled ?? true,
                    is_button_enabled: settings.ad1_is_button_enabled ?? true,
                    metadata: Array.isArray(settings.ad1_images_metadata) ? settings.ad1_images_metadata.map((meta) => ({
                        name: meta.name,
                        size: Number(meta.size) || 0,
                    })) : [],
                },
                ad2: {
                    images: Array.isArray(settings.ad2_images) ? settings.ad2_images.map((img) => `${BASE_URL}/uploads/trips/${img}`) : [],
                    button_text: settings.ad2_button_text || '',
                    link: settings.ad2_link || '',
                    image_title: settings.ad2_image_title || '',
                    is_image_title_enabled: settings.ad2_is_image_title_enabled ?? true,
                    is_button_enabled: settings.ad2_is_button_enabled ?? true,
                    metadata: Array.isArray(settings.ad2_images_metadata) ? settings.ad2_images_metadata.map((meta) => ({
                        name: meta.name,
                        size: Number(meta.size) || 0,
                    })) : [],
                },
            };

            res.status(200).json({
                success: true,
                message: 'Promotions updated successfully',
                data: responseData,
            });
        }catch(err){
            console.error('updatePromotion error:', err);
            res.status(500).json({
                success: false,
                message: 'Server error',
                errors : { server: err.message },
            });
        }
    }
};
module.exports = tripsController;
