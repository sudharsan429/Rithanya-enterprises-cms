const express = require('express');
const router = express.Router();
const { getUsers, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('superadmin', 'admin'), getUsers);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateUser);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteUser);

module.exports = router;
