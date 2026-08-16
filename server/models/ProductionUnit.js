const mongoose = require('mongoose');

const productionUnitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ProductionUnit', productionUnitSchema);
