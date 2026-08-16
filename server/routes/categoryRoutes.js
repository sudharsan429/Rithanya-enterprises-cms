const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getCategories);
router.post('/', protect, authorize('superadmin', 'admin', 'prod_manager'), createCategory);
router.put('/:id', protect, authorize('superadmin', 'admin', 'prod_manager'), updateCategory);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteCategory);

module.exports = router;
