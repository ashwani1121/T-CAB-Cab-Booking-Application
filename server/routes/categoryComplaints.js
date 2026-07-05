const express                 = require('express');
const router                  = express.Router();
const catComplaintsController = require('../controllers/catComplaintsController');
const adminAuthMiddleware     = require('../middleware/adminAuth');

// Fetch all Category Complaints
router.get('/', adminAuthMiddleware, catComplaintsController.getCategoryComplaints);

// Get a Category Complaints by ID
router.get('/:id', adminAuthMiddleware, catComplaintsController.getCategoryComplaintsById);

// Create a Category Complaints 
router.post('/', adminAuthMiddleware, catComplaintsController.createCategoryComplaint);

// Update a Category Complaints 
router.put('/:id', adminAuthMiddleware, catComplaintsController.updateCategoryComplaint);

// Delete a Category Complaints (soft delete)
router.delete('/:id', adminAuthMiddleware, catComplaintsController.deleteCategoryComplaint);

module.exports = router;