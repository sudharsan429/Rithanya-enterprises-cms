const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getProducts);
router.post('/', protect, authorize('superadmin', 'admin', 'prod_manager'), createProduct);
router.put('/:id', protect, authorize('superadmin', 'admin', 'prod_manager'), updateProduct);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteProduct);

module.exports = router;
