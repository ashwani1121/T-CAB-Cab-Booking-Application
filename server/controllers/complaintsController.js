const { Complaint, ComplaintAssignment, catComplaint, subCatComplaint, Settings, User, UserRole, Role, RideRequests, Vehicletypes, State } = require('../models');
const { Op }           = require('sequelize');
const { sequelize }    = require('../config/db'); 
const STATUS_COLOR_MAP = {
    'open'             : '#3B82F6',  
    'resolved'         : '#10B981', 
    'escalate'         : '#F59E0B',  
    'closed'           : '#6B7280',  
    'reopen'           : '#EF4444'   
};
const complaintsController = {

    // Get all complaints 
    getAllComplaints: async (req, res) => {
        try{
            const {
                page             = 1,
                limit            = 10,
                search           = '',
                status           = '',
                category_id      = '',
                subcategory_id   = '',
                user_type        = '', 
                ride_id          = '',
                state_id         = '',          
                pickup_state_id  = '',   
                dropoff_state_id = '',
                ticket_no        = '',
                owner_id         = '',
                sort             = 'created_at',
                order            = 'desc'
            } = req.query;
            
            const currentUserId  = req.user.userId;
            const isSuperAdmin   = await complaintsController.isSuperAdmin(currentUserId);
            const pageNum        = parseInt(page, 10);
            const limitNum       = Math.min(parseInt(limit, 10), 100);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid pagination parameters' 
                });
            }
            const where     = {};
            const rideWhere = {};
            if(!isSuperAdmin){
                // Get complaint IDs with active assignments
                const complaintIdsWithAssignments = await ComplaintAssignment.findAll({
                    where: { is_active: true },
                    attributes: ['complaint_id'],
                    raw: true
                });
                const assignedComplaintIds = complaintIdsWithAssignments.map(a => a.complaint_id);
                // Get complaint IDs where user is assigned
                const userAssignedComplaints = await ComplaintAssignment.findAll({
                    where: { 
                        assigned_to: currentUserId, 
                        is_active: true 
                    },
                    attributes: ['complaint_id'],
                    raw: true
                });
                const userAssignedComplaintIds = userAssignedComplaints.map(a => a.complaint_id);
                // Build visibility condition
                const visibilityConditions = [
                    { owner_id: currentUserId }, // Owned by user
                    { id: { [Op.notIn]: assignedComplaintIds } } // No active assignments (visible to all)
                ];
                if(userAssignedComplaintIds.length > 0){
                    visibilityConditions.push({ id: { [Op.in]: userAssignedComplaintIds } }); // Assigned to user
                }
                where[Op.or] = visibilityConditions;
            }
            // If SuperAdmin, no visibility filter applied (sees everything)
            if(ticket_no && ticket_no.trim()){
                where.ticket_no = { [Op.like]: `%${ticket_no.trim()}%` };
            }
            if(search && search.trim()){
                const searchTerm = search.trim();
                if(searchTerm.toUpperCase().startsWith('TKT-')){
                    where.ticket_no = { [Op.like]: `%${searchTerm}%` };
                }else{
                    const searchConditions = [
                        { ticket_no: { [Op.like]: `%${searchTerm}%` } },
                        { title: { [Op.like]: `%${searchTerm}%` } },
                        { description: { [Op.like]: `%${searchTerm}%` } },
                        { custom_query: { [Op.like]: `%${searchTerm}%` } },
                        { '$ride.ride_number$': { [Op.like]: `%${searchTerm}%` } },
                        { '$passenger.mobile$': { [Op.like]: `%${searchTerm}%` } },
                        { '$passenger.name$': { [Op.like]: `%${searchTerm}%` } },
                        { '$ride.driver.mobile$': { [Op.like]: `%${searchTerm}%` } },
                        { '$ride.driver.name$': { [Op.like]: `%${searchTerm}%` } }
                    ];
                    // Merge search conditions with existing Or conditions
                    if(where[Op.or]){
                        where[Op.and] = [
                            { [Op.or]: where[Op.or] },
                            { [Op.or]: searchConditions }
                        ];
                        delete where[Op.or];
                    }else{
                        where[Op.or] = searchConditions;
                    }
                }
            }
            if(status && ['open', 'resolved', 'escalate', 'closed', 'reopen'].includes(status)) {
                where.status = status;
            }
            if(category_id) where.category_id       = category_id;
            if(subcategory_id) where.subcategory_id = subcategory_id;
            if(user_type) where.user_type           = user_type;
            if(ride_id) where.ride_id               = ride_id;
            if(owner_id) where.owner_id             = owner_id;
            if(state_id){
                rideWhere[Op.or] = [
                    { pickup_state_id: state_id },
                    { dropoff_state_id: state_id }
                ];
            }
            if(pickup_state_id) rideWhere.pickup_state_id   = pickup_state_id;
            if(dropoff_state_id) rideWhere.dropoff_state_id = dropoff_state_id;
            const validSortFields                           = ['ticket_no', 'title', 'status', 'created_at', 'updated_at', 'resolved_at'];
            const sortField                                 = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder                                 = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const { count, rows }                           = await Complaint.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: User,
                        as: 'resolver',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: catComplaint,
                        as: 'category',
                        attributes: ['id', 'category']
                    },
                    {
                        model: subCatComplaint,
                        as: 'subcategory',
                        attributes: ['id', 'subcategory'],
                        required: false
                    },
                    {
                        model: RideRequests,
                        as: 'ride',
                        attributes: [
                            'id', 
                            'ride_number', 
                            'pickup_address', 
                            'pickup_state',
                            'pickup_state_id',
                            'dropoff_address', 
                            'dropoff_state',
                            'dropoff_state_id',
                            'requested_at', 
                            'status', 
                            'final_fare'
                        ],
                        where: Object.keys(rideWhere).length > 0 ? rideWhere : undefined,
                        required: Object.keys(rideWhere).length > 0,
                        include: [
                            {
                                model: User,
                                as: 'driver',
                                attributes: ['id', 'name', 'mobile'],
                                required: false
                            },
                            {
                                model: State,
                                as: 'pickupState',
                                attributes: ['id', 'state_name', 'state_code'],
                                required: false
                            },
                            {
                                model: State,
                                as: 'dropState',
                                attributes: ['id', 'state_name', 'state_code'],
                                required: false
                            }
                        ]
                    },
                    {
                        model: ComplaintAssignment, 
                        as: 'assignments',
                        attributes: ['id', 'assigned_to', 'assigned_by', 'assigned_at', 'notes', 'is_active'],
                        required: false,
                        include: [
                            {
                                model: User,
                                as: 'assignedUser',
                                attributes: ['id', 'name', 'email']
                            }
                        ]
                    }
                ],
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                distinct: true,
                subQuery: false
            });
            const hasComplainAssingedPermission = await complaintsController.hasComplainAssingedPermission(currentUserId);
            return res.status(200).json({
                success: true,
                data: rows,
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(count / limitNum)
                },
                filters: {
                    search,
                    ticket_no,
                    status,
                    category_id,
                    subcategory_id,
                    user_type,
                    owner_id,
                    state_id,
                    pickup_state_id,
                    dropoff_state_id
                },
                visibility: {
                    is_super_admin: isSuperAdmin,
                    viewing_as: currentUserId,
                    has_assigned_permission: hasComplainAssingedPermission
                }
            });
        }catch(err){
            console.error('getAllComplaints error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch complaints',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get single complaint by ID or Ticket Number
    getComplaintById: async (req, res) => {
        try{
            const { id } = req.params;
            const whereClause = id.toUpperCase().startsWith('TKT-') ? { ticket_no: id.toUpperCase() } : { id: id };
            const complaint = await Complaint.findOne({
                where: whereClause,
                include: [
                    { 
                        model: User, 
                        as: 'passenger', 
                        attributes: ['id', 'name', 'email', 'mobile'] 
                    },
                    { 
                        model: User, 
                        as: 'resolver', 
                        attributes: ['id', 'name', 'email'], 
                        required: false 
                    },
                    { 
                        model: User, 
                        as: 'owner',
                        attributes: ['id', 'name', 'email'], 
                        required: false 
                    },
                    { 
                        model: catComplaint, 
                        as: 'category', 
                        attributes: ['id', 'category'] 
                    },
                    { 
                        model: subCatComplaint, 
                        as: 'subcategory', 
                        attributes: ['id', 'subcategory'],
                        required: false
                    },
                    {
                        model: RideRequests,
                        as: 'ride',
                        attributes: [
                            'id', 
                            'ride_number', 
                            'pickup_address', 
                            'pickup_state',
                            'dropoff_address', 
                            'dropoff_state',
                            'requested_at', 
                            'status', 
                            'final_fare'
                        ],
                        required: false,
                        include: [
                            {
                                model: User,
                                as: 'driver',
                                attributes: ['id', 'name', 'mobile'],
                                required: false
                            },
                            {
                                model: State,
                                as: 'pickupState',
                                attributes: ['id', 'state_name', 'state_code'],
                                required: false
                            },
                            {
                                model: State,
                                as: 'dropState',
                                attributes: ['id', 'state_name', 'state_code'],
                                required: false
                            }
                        ]
                    },
                    {
                        model: ComplaintAssignment, 
                        as: 'assignments',
                        attributes: ['id', 'assigned_to', 'assigned_by', 'assigned_at', 'notes', 'is_active'],
                        include: [
                            {
                                model: User,
                                as: 'assignedUser',
                                attributes: ['id', 'name', 'email']
                            },
                            {
                                model: User,
                                as: 'assignedByUser',
                                attributes: ['id', 'name', 'email']
                            }
                        ],
                        order: [['assigned_at', 'DESC']]
                    }
                ]
            });
            if(!complaint){
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }
            return res.status(200).json({
                success: true,
                data: complaint
            });
        }catch(err){
            console.error('getComplaintById error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch complaint',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Create a new complaint
    createComplaint: async (req, res) => {
        const transaction = await Complaint.sequelize.transaction();
        try{
            const { 
                category_id, 
                subcategory_id, 
                custom_query,
                user_id,
                user_type, 
                ride_id,
                title, 
                description,
                status = 'open'
            } = req.body;
            // Handle file uploads
            const attachments = req.files ? req.files.map(file => {
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/').pop();
                return {
                    filename: file.filename,
                    originalName: file.originalname,
                    path: `uploads/${relativePath}`,
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: new Date()
                };
            }) : [];
            const adminUserId = req.user.userId;
            const errors = {};
            if(!category_id) errors.category_id = 'Category is required';
            if(!user_id) errors.user_id = 'User is required';
            if(!user_type) errors.user_type = 'User type is required';
            if(!ride_id) errors.ride_id = 'Ride is required';
            if(!title || !title.trim()) errors.title = 'Title is required';
            else if(title.trim().length > 255) errors.title = 'Title must not exceed 255 characters';
            
            // Check if category is "Others" and custom_query is required
            if(category_id){
                const category = await catComplaint.findByPk(category_id, { transaction });
                if(category && category.category.toLowerCase() === 'others'){
                    if(!custom_query || !custom_query.trim()){
                        errors.custom_query = 'Custom query is required for "Others" category';
                    }
                }
            }
            
            if(user_type && !['passenger', 'driver'].includes(user_type)){
                errors.user_type = 'User type must be either "passenger" or "driver"';
            }
            
            if(status && !['open', 'resolved', 'escalate', 'closed', 'reopen'].includes(status)){
                errors.status = 'Invalid status value';
            }
            
            if(user_id){
                const user = await User.findByPk(user_id, { transaction });
                if (!user) errors.user_id = 'User not found';
            }
            
            if(ride_id && user_id && user_type){
                const rideWhere = user_type === 'passenger' 
                    ? { id: ride_id, user_id: user_id }
                    : { id: ride_id, driver_id: user_id };
                const ride = await RideRequests.findOne({
                    where: rideWhere,
                    transaction
                });
                if(!ride){
                    errors.ride_id = `Ride not found or does not belong to the selected ${user_type}`;
                }
            }
            
            if(category_id){
                const category = await catComplaint.findOne({
                    where: { id: category_id, status: 1 },
                    transaction
                });
                if (!category) errors.category_id = 'Invalid or inactive category';
            }
            
            if(subcategory_id && category_id){
                const subcategory = await subCatComplaint.findOne({
                    where: {
                        id: subcategory_id,
                        category_id: category_id,
                        status: 1
                    },
                    transaction
                });
                if(!subcategory) errors.subcategory_id = 'Invalid or inactive subcategory';
            }
            
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            
            const newComplaint = await Complaint.create({
                category_id,
                subcategory_id: subcategory_id || null,
                custom_query: custom_query?.trim() || null,
                user_id,
                user_type,
                ride_id,
                title: title.trim(),
                description: description?.trim() || null,
                status: status || 'open',
                status_color: STATUS_COLOR_MAP[status || 'open'],
                owner_id: adminUserId, // Creator becomes owner
                attachments: attachments.length > 0 ? attachments : null,
                created_by: adminUserId,
                updated_by: adminUserId
            }, { transaction });
            await transaction.commit();
            const complaintWithDetails = await Complaint.findByPk(newComplaint.id, {
                include: [
                    { model: User, as: 'passenger', attributes: ['id', 'name', 'email', 'mobile'] },
                    { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
                    { model: catComplaint, as: 'category', attributes: ['id', 'category'] },
                    { model: subCatComplaint, as: 'subcategory', attributes: ['id', 'subcategory'], required: false },
                    { 
                        model: RideRequests, 
                        as: 'ride', 
                        attributes: ['id', 'ride_number', 'pickup_address', 'dropoff_address', 'requested_at'], 
                        required: false 
                    }
                ]
            });
            return res.status(201).json({
                success: true,
                message: 'Complaint submitted successfully',
                data: complaintWithDetails
            });
        }catch(err){
            if(req.files){
                req.files.forEach(file => {
                    if(fs.existsSync(file.path)){
                        fs.unlinkSync(file.path);
                    }
                });
            }
            await transaction.rollback();
            console.error('createComplaint error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to submit complaint',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Update complaint 
    updateComplaint: async (req, res) => {
        const transaction = await Complaint.sequelize.transaction();
        try{
            const { id } = req.params;
            const userId = req.user.userId;
            const {
                category_id,
                subcategory_id,
                custom_query,
                title,
                description,
                status,
                resolved_by,
                resolution_notes,
                existing_attachments,
                user_type,
                user_id,
                ride_id
            } = req.body;
            const complaint = await Complaint.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if(!complaint){
                await transaction.rollback();
                if(req.files){
                    const fs = require('fs');
                    req.files.forEach(file => {
                        if(fs.existsSync(file.path)){
                            fs.unlinkSync(file.path);
                        }
                    });
                }
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }
            // Validation
            const errors = {};
            if(title !== undefined){
                if(!title || !title.trim()){
                    errors.title = 'Title is required';
                }else if(title.trim().length > 255){
                    errors.title = 'Title must not exceed 255 characters';
                }
            }
            if(category_id !== undefined){
                const category = await catComplaint.findOne({
                    where: { id: category_id, status: 1 },
                    transaction
                });
                if(!category){
                    errors.category_id = 'Invalid or inactive category';
                }
                else if(category.category.toLowerCase() === 'others'){
                    if(!custom_query || !custom_query.trim()){
                        errors.custom_query = 'Custom query is required for "Others" category';
                    }
                }
            }
            if(subcategory_id !== undefined && subcategory_id !== null && subcategory_id !== ''){
                const catId = category_id !== undefined ? category_id : complaint.category_id;
                const subcategory = await subCatComplaint.findOne({
                    where: {
                        id: subcategory_id,
                        category_id: catId,
                        status: 1
                    },
                    transaction
                });
                if(!subcategory){
                    errors.subcategory_id = 'Invalid subcategory or does not belong to selected category';
                }
            }
            const validStatuses = ['open', 'resolved', 'escalate', 'closed', 'reopen'];
            if(status !== undefined && !validStatuses.includes(status)){
                errors.status = 'Invalid status';
            }
            // Validate resolution notes for resolved/closed status
            const finalStates = ['resolved', 'closed'];
            if(status && finalStates.includes(status)){
                if(!resolution_notes?.trim() && !complaint.resolution_notes){
                    errors.resolution_notes = 'Resolution notes are required when resolving or closing';
                }
            }
            if(Object.keys(errors).length > 0){
                await transaction.rollback();
                if(req.files){
                    const fs = require('fs');
                    req.files.forEach(file => {
                        if(fs.existsSync(file.path)){
                            fs.unlinkSync(file.path);
                        }
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            // FIX: Handle attachments properly
            const fs   = require('fs');
            const path = require('path');
            const currentAttachments = complaint.attachments || [];
            // Parse existing_attachments (files to keep)
            let keepAttachmentPaths = [];
            if(existing_attachments){
                try{
                    const parsed = typeof existing_attachments === 'string' 
                        ? JSON.parse(existing_attachments) 
                        : existing_attachments;
                    keepAttachmentPaths = Array.isArray(parsed) ? parsed : [];
                }catch(e){
                    console.error('Error parsing existing_attachments:', e);
                    keepAttachmentPaths = [];
                }
            }
            // Normalize paths - remove base URL if present and normalize slashes
            const normalizePath = (p) => {
                if(!p) return '';
                // Remove base URL parts if present
                let cleanPath = p.replace(/^https?:\/\/[^\/]+\//, '');
                // Remove 'uploads/' prefix if present for comparison
                cleanPath = cleanPath.replace(/^uploads\//, '');
                // Normalize slashes
                return cleanPath.replace(/\\/g, '/');
            };
            // Filter attachments to retain
            const retainedAttachments = currentAttachments.filter(att => {
                const attPath = normalizePath(att.path || att.filename);
                return keepAttachmentPaths.some(keepPath => {
                    const normalizedKeepPath = normalizePath(keepPath);
                    return attPath === normalizedKeepPath || 
                        `uploads/${attPath}` === normalizedKeepPath ||
                        attPath === `uploads/${normalizedKeepPath}`;
                });
            });
            // Identify attachments to delete
            const attachmentsToDelete = currentAttachments.filter(att => {
                const attPath = normalizePath(att.path || att.filename);
                return !keepAttachmentPaths.some(keepPath => {
                    const normalizedKeepPath = normalizePath(keepPath);
                    return attPath === normalizedKeepPath || 
                        `uploads/${attPath}` === normalizedKeepPath ||
                        attPath === `uploads/${normalizedKeepPath}`;
                });
            });
            // Handle new file uploads
            const newAttachments = req.files ? req.files.map(file => {
                // Extract relative path from absolute path
                const relativePath = file.path.replace(/\\/g, '/').split('/uploads/').pop();
                return {
                    filename: file.filename,
                    originalName: file.originalname,
                    path: `uploads/${relativePath}`, 
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: new Date()
                };
            }) : [];
            // Combine retained and new attachments
            const finalAttachments = [...retainedAttachments, ...newAttachments];
            // Build update data
            const updateData = { 
                updated_by: userId,
                attachments: finalAttachments.length > 0 ? finalAttachments : null
            };
            if(title !== undefined) updateData.title = title.trim();
            if(description !== undefined) updateData.description = description?.trim() || null;
            if(custom_query !== undefined) updateData.custom_query = custom_query?.trim() || null;
            if(category_id !== undefined) updateData.category_id = category_id;
            if(subcategory_id !== undefined) updateData.subcategory_id = subcategory_id || null;
            if(resolved_by !== undefined) updateData.resolved_by = resolved_by || null;
            if(resolution_notes !== undefined) updateData.resolution_notes = resolution_notes?.trim() || null;
            // Handle status changes with timestamps
            if(status !== undefined){
                updateData.status = status;
                updateData.status_color = STATUS_COLOR_MAP[status];
                if(status === 'resolved' && !complaint.resolved_at){
                    updateData.resolved_at = new Date();
                    updateData.resolved_by = userId;
                }else 
                if(status === 'escalate' && !complaint.escalated_at){
                    updateData.escalated_at = new Date();
                }else 
                if(status === 'closed' && !complaint.closed_at){
                    updateData.closed_at = new Date();
                }else 
                if(status === 'reopen'){
                    updateData.reopened_at = new Date();
                    updateData.closed_at = null;
                    updateData.resolved_at = null;
                }else 
                if(status === 'open'){
                    updateData.resolved_at = null;
                    updateData.escalated_at = null;
                    updateData.closed_at = null;
                    updateData.reopened_at = null;
                }
            }
            await complaint.update(updateData, { transaction });
            // Delete old files AFTER successful update
            attachmentsToDelete.forEach(att => {
                const filePath = path.join(__dirname, '..', att.path);
                if(fs.existsSync(filePath)){
                    try{
                        fs.unlinkSync(filePath);
                        console.log('Deleted file:', filePath);
                    }catch(err){
                        console.error('Failed to delete file:', filePath, err);
                    }
                }
            });
            // Reload complaint with associations
            await complaint.reload({
                include: [
                    { model: User, as: 'passenger', attributes: ['id', 'name', 'email', 'mobile'] },
                    { model: User, as: 'resolver', attributes: ['id', 'name', 'email'], required: false },
                    { model: User, as: 'owner', attributes: ['id', 'name', 'email'], required: false },
                    { model: catComplaint, as: 'category', attributes: ['id', 'category'] },
                    { model: subCatComplaint, as: 'subcategory', attributes: ['id', 'subcategory'], required: false },
                    { model: RideRequests, as: 'ride', attributes: ['id', 'ride_number', 'pickup_address', 'dropoff_address', 'requested_at'], required: false }
                ],
                transaction
            });
            await transaction.commit();
            return res.status(200).json({
                success: true,
                message: 'Complaint updated successfully',
                data: complaint
            });
        }catch(err){
            await transaction.rollback();
            if(req.files){
                const fs = require('fs');
                req.files.forEach(file => {
                    if(fs.existsSync(file.path)){
                        try{
                            fs.unlinkSync(file.path);
                        }catch(e){
                            console.error('Error deleting uploaded file:', e);
                        }
                    }
                });
            }
            console.error('updateComplaint error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update complaint',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Delete complaint
    deleteComplaint: async (req, res) => {
        try{
            const { id } = req.params;
            const complaint = await Complaint.findByPk(id);
            if(!complaint){
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }
            await complaint.destroy();
            return res.status(200).json({
                success: true,
                message: 'Complaint deleted successfully'
            });
        }catch(err){
            console.error('deleteComplaint error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete complaint',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Assign complaint to team members 
    assignComplaint: async (req, res) => {
        const transaction = await Complaint.sequelize.transaction();
        try{
            const { id } = req.params;
            const { assigned_to, notes } = req.body;
            const adminUserId = req.user.userId;
            
            if(!assigned_to || !Array.isArray(assigned_to) || assigned_to.length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'At least one team member must be assigned'
                });
            }
            
            const complaint = await Complaint.findByPk(id, { transaction });
            if(!complaint){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }
            
            // Check if complaint already has active assignments
            const existingAssignments = await ComplaintAssignment.findAll({
                where: { 
                    complaint_id: id, 
                    is_active: true 
                },
                transaction
            });
            
            // If complaint has no owner, first assigned person becomes owner
            if(!complaint.owner_id){
                await complaint.update({
                    owner_id: assigned_to[0],
                    updated_by: adminUserId
                }, { transaction });
            }
            
            // Create new assignments (doesn't deactivate existing ones - allows multiple assignments)
            const assignments = await Promise.all(
                assigned_to.map(userId => 
                    ComplaintAssignment.create({
                        complaint_id: id,
                        assigned_to: userId,
                        assigned_by: adminUserId,
                        notes: notes || null,
                        is_active: true
                    }, { transaction })
                )
            );
            
            await transaction.commit();
            
            return res.status(200).json({
                success: true,
                message: 'Complaint assigned successfully',
                data: {
                    complaint_id: id,
                    new_assignments: assignments.length,
                    total_active_assignments: existingAssignments.length + assignments.length,
                    owner_set: !complaint.owner_id
                }
            });
        }catch(err){
            await transaction.rollback();
            console.error('assignComplaint error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to assign complaint',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Unassign/Remove assignment
    unassignComplaint: async (req, res) => {
        const transaction = await Complaint.sequelize.transaction();
        try{
            const { id } = req.params;
            const { assignment_ids } = req.body;
            
            if(!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0){
                return res.status(400).json({
                    success: false,
                    message: 'Assignment IDs are required'
                });
            }
            
            // Get the assignments before deactivating to check if owner is being removed
            const assignmentsToRemove = await ComplaintAssignment.findAll({
                where: { 
                    id: { [Op.in]: assignment_ids },
                    complaint_id: id
                },
                transaction
            });
            
            const complaint = await Complaint.findByPk(id, { transaction });
            if(!complaint){
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }
            
            // Deactivate the assignments
            await ComplaintAssignment.update(
                { is_active: false },
                { 
                    where: { 
                        id: { [Op.in]: assignment_ids },
                        complaint_id: id
                    },
                    transaction 
                }
            );
            
            // Check if any active assignments remain
            const remainingAssignments = await ComplaintAssignment.findAll({
                where: { 
                    complaint_id: id, 
                    is_active: true 
                },
                transaction
            });
            
            // If no assignments remain, clear owner
            if(remainingAssignments.length === 0){
                await complaint.update(
                    { owner_id: null },
                    { where: { id }, transaction }
                );
            } 
            // If owner was removed but other assignments remain, transfer ownership to first remaining assignment
            else if(complaint.owner_id && assignmentsToRemove.some(a => a.assigned_to === complaint.owner_id)){
                await complaint.update(
                    { owner_id: remainingAssignments[0].assigned_to },
                    { where: { id }, transaction }
                );
            }
            
            await transaction.commit();
            
            return res.status(200).json({
                success: true,
                message: 'Assignment removed successfully',
                data: {
                    complaint_id: id,
                    removed_assignments: assignmentsToRemove.length,
                    remaining_assignments: remainingAssignments.length,
                    ownership_cleared: remainingAssignments.length === 0,
                    ownership_transferred: complaint.owner_id && assignmentsToRemove.some(a => a.assigned_to === complaint.owner_id) && remainingAssignments.length > 0
                }
            });
        }catch(err){
            await transaction.rollback();
            console.error('unassignComplaint error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to remove assignment',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get filter options (for dropdown menus)
    getFilterOptions: async (req, res) => {
        try{
            const categories = await catComplaint.findAll({
                where: { status: 1 },
                attributes: ['id', 'category'],
                order: [['category', 'ASC']]
            });
            
            const states = await State.findAll({
                where: { status: 1 },
                attributes: ['id', 'state_name', 'state_code'],
                order: [['state_name', 'ASC']]
            });
            
            const statuses = [
                { value: 'open', label: 'Open', color: '#3B82F6' },
                { value: 'resolved', label: 'Resolved', color: '#10B981' },
                { value: 'escalate', label: 'Escalated', color: '#F59E0B' },
                { value: 'closed', label: 'Closed', color: '#6B7280' },
                { value: 'reopen', label: 'Reopened', color: '#EF4444' }
            ];
            
            const userTypes = [
                { value: 'passenger', label: 'Passenger' },
                { value: 'driver', label: 'Driver' }
            ];
            
            return res.status(200).json({
                success: true,
                data: {
                    categories,
                    states,
                    statuses,
                    userTypes
                }
            });
        }catch(err){
            console.error('getFilterOptions error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch filter options',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get all active categories for app
    getAppCategories: async (req, res) => {
        try{
            const categories = await catComplaint.findAll({
                where: { status: 1 },
                attributes: ['id', 'category', 'description'],
                order: [['category', 'ASC']]
            });
            return res.status(200).json({
                success: true,
                data: categories
            });
        }catch(err){
            console.error('getAppCategories error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get subcategories by category ID for app
    getAppSubcategories: async (req, res) => {
        try{
            const { category_id } = req.params;
            if(!category_id){
                return res.status(400).json({
                    success: false,
                    message: 'Category ID is required'
                });
            }
            // Verify category exists and is active
            const category = await catComplaint.findOne({
                where: { id: category_id, status: 1 }
            });
            if(!category){
                return res.status(404).json({
                    success: false,
                    message: 'Category not found or inactive'
                });
            }
            const subcategories = await subCatComplaint.findAll({
                where: {
                    category_id: category_id,
                    status: 1
                },
                attributes: ['id', 'subcategory', 'description'],
                order: [['subcategory', 'ASC']]
            });
            return res.status(200).json({
                success: true,
                data: {
                    category: {
                        id: category.id,
                        name: category.category
                    },
                    subcategories: subcategories
                }
            });
        }catch(err){
            console.error('getAppSubcategories error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch subcategories',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Helper function to check if user has permission to be assigned complaints
    hasComplainAssingedPermission: async (userId) => {
        try{
            const adminSettings = await Settings.findOne({
                where: { role: 'admin' }
            });
            if(!adminSettings || !adminSettings.complain_assignable_roles) {
                return false;
            }
            const roleIds = adminSettings.complain_assignable_roles
                .split(',')
                .map(id => parseInt(id.trim()))
                .filter(id => !isNaN(id));
            if(roleIds.length === 0) {
                return false;
            }
            // Check if user has any of the assignable roles
            const userRole = await UserRole.findOne({
                where: { 
                    user_id: userId,
                    role_id: { [Op.in]: roleIds }
                }
            });
            return !!userRole;
        }catch(err){
            console.error('hasComplainAssingedPermission error:', err);
            return false;
        }
    },
    
    // Helper function to check if user is SuperAdmin
    isSuperAdmin: async (userId) => {
        const userRole = await UserRole.findOne({
            where      : { user_id: userId },
            include    : [{
                model  : Role,
                as     : 'Role',
                where  : { name: 'Superadmin' }
            }]
        });
        return !!userRole;
    },

    // Search users for complaint creation
    searchUsers: async (req, res) => {
        try{
            const { search = '', user_type } = req.query;
            if(!user_type || !['passenger', 'driver'].includes(user_type)){
                return res.status(400).json({
                    success: false,
                    message: 'Valid user_type (passenger or driver) is required'
                });
            }
            if(!search || search.trim().length < 2){
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
            }
            const searchTerm = `%${search.trim()}%`;
            const roleName   = user_type === 'passenger' ? 'User' : 'Driver';
            const users      = await User.findAll({
                attributes   : ['id', 'name', 'email', 'mobile'],
                include      : [
                    {
                        model       : UserRole,
                        as          : 'UserRoles',
                        attributes  : [],
                        required    : true,
                        include     : [
                            {
                                model       : Role,
                                as          : 'Role',
                                attributes  : [],
                                where       : { name: roleName }
                            }
                        ]
                    }
                ],
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: searchTerm } },
                        { email: { [Op.like]: searchTerm } },
                        { mobile: { [Op.like]: searchTerm } }
                    ],
                    status: 1
                },
                limit: 20,
                order: [['name', 'ASC']],
                subQuery: false
            });
            return res.status(200).json({
                success     : true,
                data        : users.map(user => ({
                    id      : user.id,
                    name    : user.name,
                    email   : user.email,
                    mobile  : user.mobile,
                    role    : user_type
                }))
            });
        }catch(err){
            console.error('searchUsers error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to search users',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Search team members for assignment
    searchTeamMembers: async (req, res) => {
        try{
            const { search = '' } = req.query;
            if(!search || search.trim().length < 2){
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
            }
            const searchTerm  = `%${search.trim()}%`;
            const teamMembers = await User.findAll({
                attributes    : ['id', 'name', 'email', 'mobile'],
                include       : [
                    {
                        model       : UserRole,
                        as          : 'UserRoles',
                        attributes  : [],
                        required    : true,
                        include     : [
                            {
                                model       : Role,
                                as          : 'Role',
                                attributes  : [],
                                where       : { 
                                    name    : { 
                                        [Op.in]: ['Admin', 'Support', 'Superadmin'] 
                                    } 
                                }
                            }
                        ]
                    }
                ],
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: searchTerm } },
                        { email: { [Op.like]: searchTerm } }
                    ],
                    status: 1
                },
                limit: 20,
                order: [['name', 'ASC']],
                subQuery: false
            });
            return res.status(200).json({
                success     : true,
                data        : teamMembers.map(user => ({
                    id      : user.id,
                    name    : user.name,
                    email   : user.email,
                    mobile  : user.mobile
                }))
            });
        }catch(err){
            console.error('searchTeamMembers error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to search team members',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get user rides for complaint creation
    getUserRides: async (req, res) => {
        try{
            const { user_id, user_type, search = '' } = req.query;
            if(!user_id || !user_type){
                return res.status(400).json({
                    success: false,
                    message: 'user_id and user_type are required'
                });
            }
            if(!['passenger', 'driver'].includes(user_type)){
                return res.status(400).json({
                    success: false,
                    message: 'user_type must be either "passenger" or "driver"'
                });
            }
            const whereClause = user_type === 'passenger' ? { user_id: user_id } : { driver_id: user_id };
            if(search && search.trim()){
                whereClause.ride_number = {
                    [Op.like]: `%${search.trim()}%`
                };
            }
            whereClause.status = {
                [Op.in]: ['ride_completed', 'cancelled', 'cancelled_by_user', 'cancelled_by_driver']
            };
            const rides = await RideRequests.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'passenger',
                        attributes: ['id', 'name', 'email', 'mobile']
                    },
                    {
                        model: User,
                        as: 'driver',
                        attributes: ['id', 'name', 'email', 'mobile'],
                        required: false
                    },
                    {
                        model: Vehicletypes,
                        as: 'vehicleType',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: 50
            });
            return res.status(200).json({
                success             : true,
                data                : rides.map(ride => ({
                    id              : ride.id,
                    ride_number     : ride.ride_number,
                    ride_date       : ride.requested_at,
                    pickup_address  : ride.pickup_address,
                    dropoff_address : ride.dropoff_address,
                    status          : ride.status,
                    final_fare      : ride.final_fare,
                    passenger       : ride.passenger,
                    driver          : ride.driver,
                    vehicle_type    : ride.vehicleType
                }))
            });
        }catch(err){
            console.error('getUserRides error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user rides',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get complaint history for app user (passenger/driver)
    getAppComplaintHistory: async (req, res) => {
        try{
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            const {
                page        = 1,
                limit       = 10,
                status      = '',
                category_id = '',
                sort        = 'created_at',
                order       = 'desc'
            } = req.query;
            // Determine if user is passenger or driver
            const userRoles = await UserRole.findAll({
                where: { user_id: userId },
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name']
                }]
            });
            const roleNames   = userRoles.map(ur => ur.Role.name);
            const isPassenger = roleNames.includes('User');
            const isDriver    = roleNames.includes('Driver');
            if(!isPassenger && !isDriver){
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Not a passenger or driver'
                });
            }
            const userType = isPassenger ? 'passenger' : 'driver';
            // Pagination validation
            const pageNum  = parseInt(page, 10);
            const limitNum = Math.min(parseInt(limit, 10), 50);
            if(isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            // Build where clause
            const where           = { user_id: userId,user_type: userType};
            if(status && ['open', 'resolved', 'escalate', 'closed', 'reopen'].includes(status)){
                where.status      = status;
            }
            if(category_id){
                where.category_id = category_id;
            }
            // Sorting validation
            const validSortFields = ['ticket_no', 'title', 'status', 'created_at', 'updated_at'];
            const sortField       = validSortFields.includes(sort) ? sort : 'created_at';
            const sortOrder       = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            // Fetch complaints
            const { count, rows } = await Complaint.findAndCountAll({
                where,
                order: [[sortField, sortOrder]],
                limit: limitNum,
                offset: (pageNum - 1) * limitNum
            });
            return res.status(200).json({
                success             : true,
                data                : rows.map(complaint => ({
                    id              : complaint.id,
                    ticket_no       : complaint.ticket_no,
                    title           : complaint.title,
                    status          : complaint.status,
                    status_color    : complaint.status_color,
                    created_at      : complaint.created_at,
                    updated_at      : complaint.updated_at,
                    resolved_at     : complaint.resolved_at,
                })),
                pagination          : {
                    total           : count,
                    page            : pageNum,
                    limit           : limitNum,
                    totalPages      : Math.ceil(count / limitNum)
                }
            });
        }catch(err){
            console.error('getAppComplaintHistory error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch complaint history',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    },

    // Get single complaint details for app user (passenger/driver)
    getAppComplaintDetails: async (req, res) => {
        try{
            // Authentication check
            if(!req.user || !req.user.userId){
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            const { id } = req.params;
            // Determine if user is passenger or driver
            const userRoles = await UserRole.findAll({
                where: { user_id: userId },
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name']
                }]
            });
            const roleNames   = userRoles.map(ur => ur.Role.name);
            const isPassenger = roleNames.includes('User');
            const isDriver    = roleNames.includes('Driver');
            if(!isPassenger && !isDriver){
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: Not a passenger or driver'
                });
            }
            const userType = isPassenger ? 'passenger' : 'driver';
            // Determine if id is ticket_no or complaint id
            const whereClause = id.toUpperCase().startsWith('TKT-') ? { ticket_no: id.toUpperCase(), user_id: userId, user_type: userType } : { id: id, user_id: userId, user_type: userType };
            // Fetch complaint with full details
            const complaint = await Complaint.findOne({
                where: whereClause,
                include: [
                    {
                        model: catComplaint,
                        as: 'category',
                        attributes: ['id', 'category']
                    },
                    {
                        model: subCatComplaint,
                        as: 'subcategory',
                        attributes: ['id', 'subcategory'],
                        required: false
                    },
                    {
                        model: RideRequests,
                        as: 'ride',
                        attributes: [
                            'id',
                            'ride_number',
                            'pickup_address',
                            'pickup_state',
                            'dropoff_address',
                            'dropoff_state',
                            'requested_at',
                            'status',
                            'final_fare'
                        ],
                        required: false,
                        include: [
                            {
                                model: User,
                                as: 'driver',
                                attributes: ['id', 'name', 'mobile'],
                                required: false
                            },
                            {
                                model: User,
                                as: 'passenger',
                                attributes: ['id', 'name', 'mobile'],
                                required: false
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'resolver',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    }
                ]
            });
            if(!complaint){
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found or you do not have access to it'
                });
            }
            return res.status(200).json({
                success             : true,
                data                : {
                    id              : complaint.id,
                    ticket_no       : complaint.ticket_no,
                    title           : complaint.title,
                    description     : complaint.description,
                    custom_query    : complaint.custom_query,
                    status          : complaint.status,
                    status_color    : complaint.status_color,
                    category        : complaint.category,
                    subcategory     : complaint.subcategory,
                    ride            : complaint.ride,
                    attachments     : complaint.attachments,
                    resolution_notes: complaint.resolution_notes,
                    resolver        : complaint.resolver,
                    created_at      : complaint.created_at,
                    updated_at      : complaint.updated_at,
                    resolved_at     : complaint.resolved_at,
                    escalated_at    : complaint.escalated_at,
                    closed_at       : complaint.closed_at,
                    reopened_at     : complaint.reopened_at
                }
            });
        }catch(err){
            console.error('getAppComplaintDetails error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch complaint details',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
};
module.exports = complaintsController;