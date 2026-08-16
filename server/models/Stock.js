const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  locationType: { 
    type: String, 
    enum: ['ProductionUnit', 'Canteen'], 
    required: true 
  },
  quantity: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  transferQty: { type: Number, default: 0 },
  soldQty: { type: Number, default: 0 },
  damagedQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  lastReconciledAt: { type: Date },
  status: { type: String, enum: ['onstock', 'transfer', 'depleted'], default: 'onstock' },
  // Kept for report/audit reference only — not used in stock operations
  dailyStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyStock' },
  sourceLocationId: { type: mongoose.Schema.Types.ObjectId, refPath: 'sourceLocationType' },
  sourceLocationType: { type: String, enum: ['ProductionUnit', 'Canteen'] },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

// Simple unique index: one stock record per product per location
stockSchema.index({ 
  productId: 1, 
  locationId: 1, 
  locationType: 1
}, { unique: true, name: 'stock_product_location_unique' });

module.exports = mongoose.model('Stock', stockSchema);
