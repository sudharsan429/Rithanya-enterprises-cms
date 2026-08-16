const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  fromLocation: { 
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'fromLocation.type', required: true },
    type: { type: String, enum: ['ProductionUnit', 'Canteen'], required: true }
  },
  toLocation: { 
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'toLocation.type', required: true },
    type: { type: String, enum: ['ProductionUnit', 'Canteen'], required: true }
  },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true },
    acceptedQuantity: { type: Number, default: 0 },
    damagedQuantity: { type: Number, default: 0 },
    rejectedQuantity: { type: Number, default: 0 },
    missingQuantity: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'partially_accepted'], 
      default: 'pending' 
    },
    dailyStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyStock' },
    remark: { type: String }
  }],
  overallStatus: { 
    type: String, 
    enum: ['pending', 'in_transit', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  transferType: { 
    type: String, 
    enum: ['PU-to-PU', 'PU-to-Canteen', 'Canteen-to-Canteen'], 
    required: true 
  },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transfer', transferSchema);
