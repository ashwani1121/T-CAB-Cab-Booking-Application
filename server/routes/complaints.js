const express             = require('express');
const router              = express.Router();
const complaintController = require('../controllers/complaintsController');
const adminAuthMiddleware = require('../middleware/adminAuth');
const { uploadMiddleware, handleMulterError } = require('../middleware/upload');

// Middleware to handle _method override for file uploads
const methodOverride = (req, res, next) => {
    if(req.body && req.body._method){
        req.method = req.body._method.toUpperCase();
        delete req.body._method;
    }
    next();
};

const { manualEscalationCheck, escalateComplaint } = require("../utils/escalationComplaints");

// Trigger scheduler manually
router.get("/test/escalation/check", async (req, res) => {
    const result = await manualEscalationCheck();
    res.json(result);
});

// Get filter options (categories, states, statuses)
router.get('/filter-options', adminAuthMiddleware, complaintController.getFilterOptions);

// Search users for complaint creation
router.get('/search-users', adminAuthMiddleware, complaintController.searchUsers);

// Search team members for assignment
router.get('/search-team-members', adminAuthMiddleware, complaintController.searchTeamMembers);

// Get user rides (for dropdown in complaint creation form)
router.get('/user-rides', adminAuthMiddleware, complaintController.getUserRides);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// Assign complaint to team members
router.post('/:id/assign', adminAuthMiddleware, complaintController.assignComplaint);

// Unassign/Remove assignments
router.post('/:id/unassign', adminAuthMiddleware, complaintController.unassignComplaint);

// Fetch all Complaints 
router.get('/', adminAuthMiddleware, complaintController.getAllComplaints);

// Get a Complaint by ID (put after specific routes to avoid conflicts)
router.get('/:id', adminAuthMiddleware, complaintController.getComplaintById);

// Create a Complaint
router.post(
    '/', 
    adminAuthMiddleware, 
    uploadMiddleware.complaintAttachmentUpload,
    handleMulterError,
    complaintController.createComplaint
);

// Update a Complaint (handles both PUT and POST with _method override)
router.put(
    '/:id', 
    adminAuthMiddleware, 
    uploadMiddleware.complaintAttachmentUpload,
    methodOverride,
    handleMulterError,
    complaintController.updateComplaint
);

// Also handle POST with _method=PUT (for file uploads that can't use PUT)
router.post(
    '/:id', 
    adminAuthMiddleware, 
    uploadMiddleware.complaintAttachmentUpload,
    methodOverride,
    handleMulterError,
    complaintController.updateComplaint
);

// Delete a Complaint 
router.delete('/:id', adminAuthMiddleware, complaintController.deleteComplaint);

module.exports = router;