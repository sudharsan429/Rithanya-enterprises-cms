const ProductionUnit = require('../models/ProductionUnit');
const User = require('../models/User');

const getProductionUnits = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = {
      name: { $regex: search, $options: 'i' }
    };

    const count = await ProductionUnit.countDocuments(query);
    const units = await ProductionUnit.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.json({
      data: units,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProductionUnit = async (req, res) => {
  const { name, location } = req.body;
  try {
    // Check for duplicate name
    const existing = await ProductionUnit.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existing) {
      return res.status(400).json({ message: 'A production unit with this name already exists' });
    }

    const unit = await ProductionUnit.create({ 
      name, 
      location,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });
    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateProductionUnit = async (req, res) => {
  const { name, location } = req.body;
  try {
    const unit = await ProductionUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Production Unit not found' });
    }

    // Check for duplicate name if name is being changed
    if (name && name.toLowerCase() !== unit.name.toLowerCase()) {
      const existing = await ProductionUnit.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Another production unit with this name already exists' });
      }
    }

    unit.name = name || unit.name;
    unit.location = location || unit.location;
    unit.updatedBy = req.user.email;
    const updatedUnit = await unit.save();
    res.json(updatedUnit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteProductionUnit = async (req, res) => {
  const { id } = req.params;
  try {
    const unit = await ProductionUnit.findById(id);
    if (!unit) {
      return res.status(404).json({ message: 'Production Unit not found' });
    }

    // Since Issues, Returns, and Acceptances modules are deleted, we can remove the integrity checks

    // Clean up references in User model
    await User.updateMany(
      { assignedProductionUnit: id },
      { $set: { assignedProductionUnit: null } }
    );

    await unit.deleteOne();
    res.json({ message: 'Production Unit and its user assignments removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProductionUnitById = async (req, res) => {
  try {
    const unit = await ProductionUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ message: 'Production Unit not found' });
    }
    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getProductionUnits, 
  getProductionUnitById, 
  createProductionUnit, 
  updateProductionUnit, 
  deleteProductionUnit 
};
