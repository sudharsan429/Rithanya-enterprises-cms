const express = require('express');
const router = express.Router();
const { initiateTransfer, acceptTransfer, getTransfers, getTransferById, updateTransfer, deleteTransfer } = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, initiateTransfer)
  .get(protect, getTransfers);

router.route('/:id')
  .get(protect, getTransferById)
  .put(protect, updateTransfer)
  .delete(protect, deleteTransfer);

router.put('/:id/accept', protect, acceptTransfer);

module.exports = router;
