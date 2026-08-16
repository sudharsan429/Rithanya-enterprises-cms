const express = require('express');
const router = express.Router();
const { addDailyStock, getDailyStock, getDailyStockById, updateDailyStock, deleteDailyStock, getStockLevels, migrateStockSource } = require('../controllers/stockController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/daily')
  .post(protect, authorize('admin', 'prod_manager'), addDailyStock)
  .get(protect, getDailyStock);

router.route('/daily/:id')
  .get(protect, getDailyStockById)
  .put(protect, authorize('admin', 'prod_manager'), updateDailyStock)
  .delete(protect, authorize('admin', 'prod_manager'), deleteDailyStock);

router.get('/levels', protect, getStockLevels);
router.post('/migrate', protect, authorize('admin', 'superadmin'), migrateStockSource);

module.exports = router;
