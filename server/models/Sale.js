const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true },
  billNo: { type: String, required: true, unique: true },
  saleTime: { type: String, required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    quantity: { type: Number, required: true },
    priceAtSale: { type: Number, required: true },
    dailyStockId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyStock' },
    uom: { type: String },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paymentMode: { 
    type: String, 
    enum: ['cash', 'upi', 'split', 'complimentary', 'discount'], 
    required: true 
  },
  paymentDetails: {
    cashAmount: { type: Number, default: 0 },
    upiAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    remarks: { type: String }
  },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
