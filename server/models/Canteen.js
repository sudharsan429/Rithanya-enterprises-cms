const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Canteen', canteenSchema);
