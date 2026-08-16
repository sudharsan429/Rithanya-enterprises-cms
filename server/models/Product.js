const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  productCode: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  lowStock: { type: Number, default: 0 },
  uom: { type: String, required: true }, 
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
