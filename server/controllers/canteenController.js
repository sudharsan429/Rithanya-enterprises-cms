const Canteen = require('../models/Canteen');
const User = require('../models/User');


const getCanteens = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const { role, email, assignedCanteen } = req.user;
    
    let query = {
      name: { $regex: search, $options: 'i' }
    };

    // Allow all roles to see all canteens for transfer purposes

    const count = await Canteen.countDocuments(query);
    const canteens = await Canteen.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.json({
      data: canteens,
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCanteen = async (req, res) => {
  const { name, location } = req.body;
  try {
    // Check for duplicate name
    const existing = await Canteen.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existing) {
      return res.status(400).json({ message: 'A canteen with this name already exists' });
    }

    const canteen = await Canteen.create({ 
      name, 
      location,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });
    res.status(201).json(canteen);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateCanteen = async (req, res) => {
  const { name, location } = req.body;
  try {
    const canteen = await Canteen.findById(req.params.id);
    if (!canteen) {
      return res.status(404).json({ message: 'Canteen not found' });
    }

    // Check for duplicate name if name is being changed
    if (name && name.toLowerCase() !== canteen.name.toLowerCase()) {
      const existing = await Canteen.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Another canteen with this name already exists' });
      }
    }

    canteen.name = name || canteen.name;
    canteen.location = location || canteen.location;
    canteen.updatedBy = req.user.email;
    const updatedCanteen = await canteen.save();
    res.json(updatedCanteen);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteCanteen = async (req, res) => {
  const { id } = req.params;
  try {
    const canteen = await Canteen.findById(id);
    if (!canteen) {
      return res.status(404).json({ message: 'Canteen not found' });
    }

    // Clean up references in User model
    await User.updateMany(
      { assignedCanteen: id },
      { $set: { assignedCanteen: null } }
    );

    await canteen.deleteOne();
    res.json({ message: 'Canteen and its user assignments removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCanteens, createCanteen, updateCanteen, deleteCanteen };
