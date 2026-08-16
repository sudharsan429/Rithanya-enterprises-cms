const express = require('express');
const router = express.Router();
const { loginUser, registerUser, forgotPassword, resetPassword, changePassword, adminResetPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', loginUser);

// Superadmin, Admin, and Prod Manager can register new users (with logic in controller)
router.post('/register', protect, authorize('superadmin', 'admin', 'prod_manager'), registerUser);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.put('/change-password', protect, changePassword);
router.post('/admin-reset/:id', protect, authorize('superadmin', 'admin'), adminResetPassword);

module.exports = router;
