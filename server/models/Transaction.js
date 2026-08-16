const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['Transfer_In', 'Transfer_Out', 'Sale', 'Adjustment', 'Return'],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  dailyStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyStock' },
  fromLocation: {
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'fromLocation.type' },
    type: { type: String, enum: ['ProductionUnit', 'Canteen'] }
  },
  toLocation: {
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'toLocation.type' },
    type: { type: String, enum: ['ProductionUnit', 'Canteen'] }
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    comment: 'Referencing the Transfer, Sale, or Return ID'
  },
  remark: {
    type: String
  }
}, { timestamps: true });

// Indexing for faster history lookups
transactionSchema.index({ 'fromLocation.id': 1 });
transactionSchema.index({ 'toLocation.id': 1 });
transactionSchema.index({ productId: 1 });
transactionSchema.index({ categoryId: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
