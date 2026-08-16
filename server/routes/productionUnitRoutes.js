const express = require('express');
const router = express.Router();
const { getProductionUnits, getProductionUnitById, createProductionUnit, updateProductionUnit, deleteProductionUnit } = require('../controllers/productionUnitController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getProductionUnits);
router.get('/:id', protect, getProductionUnitById);
router.post('/', protect, authorize('superadmin', 'admin'), createProductionUnit);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateProductionUnit);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteProductionUnit);

module.exports = router;
