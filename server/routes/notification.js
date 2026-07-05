const express = require('express');
const router  = express.Router();
const notificationController = require('../controllers/notificationController');

// Get available roles 
router.get('/roles', notificationController.getRoles);

// Get users by role ID
router.get('/:roleId', notificationController.getUsersByRole);

// Send notification
router.post('/send', notificationController.sendNotification);

// User count based on role
router.get('/:roleId/count', notificationController.getUserCountByRole);

// autocomplete for users
router.get('/:roleId/search', notificationController.searchUsersByRole);

// Get notifications for a user
router.get('/user/:user_id', notificationController.getUserNotifications);

// Create a new notification
router.post('/create', notificationController.createNotification);

// Mark notification as read
router.put('/:notification_id/read', notificationController.markAsRead);

// Mark all notifications as read for a user
router.put('/mark-all-read', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:notification_id', notificationController.deleteNotification);

// Clear all notifications for a user
router.delete('/clear-all', notificationController.clearAllNotifications);

// Get unread count for a user
router.get('/unread-count/:user_id', notificationController.getUnreadCount);

module.exports = router;


