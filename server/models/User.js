const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'prod_manager', 'salesperson'], 
    required: true 
  },
  assignedCanteen: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen' },
  assignedProductionUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionUnit' },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  resetRequested: { type: Boolean, default: false },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
