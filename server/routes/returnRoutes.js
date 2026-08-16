const express = require('express');
const router = express.Router();
const { initiateReturn, getReturns, updateReturnStatus, cancelReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, initiateReturn)
  .get(protect, getReturns);

router.put('/:id/status', protect, updateReturnStatus);
router.put('/:id/cancel', protect, cancelReturn);

module.exports = router;
