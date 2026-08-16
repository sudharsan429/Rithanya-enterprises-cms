const express = require('express');
const router = express.Router();
const { getCanteens, createCanteen, updateCanteen, deleteCanteen } = require('../controllers/canteenController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getCanteens);
router.post('/', protect, authorize('superadmin', 'admin'), createCanteen);
router.put('/:id', protect, authorize('superadmin', 'admin'), updateCanteen);
router.delete('/:id', protect, authorize('superadmin', 'admin'), deleteCanteen);

module.exports = router;
