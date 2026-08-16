const mongoose = require('mongoose');

const dailyStockSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  productionUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionUnit', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true },
    transferQty: { type: Number, default: 0 },
    soldQty: { type: Number, default: 0 },
    damagedQty: { type: Number, default: 0 },
    costPrice: { type: Number, required: true },
    price: { type: Number, required: true },
    lowStockThreshold: { type: Number },
    status: { type: String, enum: ['onstock', 'transfer'], default: 'onstock' }
  }],
  totalStock: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 }, // Expected revenue based on cost/price
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

// Ensure unique daily entry for a production unit
dailyStockSchema.index({ date: 1, productionUnitId: 1 }, { unique: true });

module.exports = mongoose.model('DailyStock', dailyStockSchema);
