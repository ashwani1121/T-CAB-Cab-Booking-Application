const express = require('express');
const router = express.Router();
const subCatComplaintsController = require('../controllers/subCatComplaintsController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Fetch all Subcategory Complaints
router.get('/', adminAuthMiddleware, subCatComplaintsController.getSubCategoryComplaints);

// Get a Subcategory Complaint by ID
router.get('/:id', adminAuthMiddleware, subCatComplaintsController.getSubCategoryComplaintsById);

// Create a Subcategory Complaint
router.post('/', adminAuthMiddleware, subCatComplaintsController.createSubCategoryComplaint);

// Update a Subcategory Complaint
router.put('/:id', adminAuthMiddleware, subCatComplaintsController.updateSubCategoryComplaint);

// Delete a Subcategory Complaint
router.delete('/:id', adminAuthMiddleware, subCatComplaintsController.deleteSubCategoryComplaint);

module.exports = router;