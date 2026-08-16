const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/sales', protect, reportController.getSaleReport);
router.get('/sales/monthly', protect, reportController.getMonthlySaleReport);
router.get('/transfers', protect, reportController.getTransferReport);
router.get('/returns', protect, reportController.getReturnReport);
router.get('/damage', protect, reportController.getDamageReport);
router.get('/audit', protect, reportController.getAuditReport);
router.get('/stock', protect, reportController.getStockReport);
router.get('/locations', protect, reportController.getLocations);

module.exports = router;
