const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['damage', 'unsold', 'expiry'], 
    required: true 
  },
  locationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  locationType: { 
    type: String, 
    enum: ['ProductionUnit', 'Canteen'], 
    required: true 
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true },
    reason: { type: String },
    dailyStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyStock' },
    expiryDate: { type: Date }
  }],
  targetLocationId: { type: mongoose.Schema.Types.ObjectId },
  targetLocationType: { 
    type: String, 
    enum: ['ProductionUnit', 'Canteen'] 
  },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
