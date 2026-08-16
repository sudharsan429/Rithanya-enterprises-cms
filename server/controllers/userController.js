const User = require('../models/User');

const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  try {
    let query = { role: { $in: ['admin', 'prod_manager', 'salesperson'] } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -__v')
      .populate('assignedCanteen', 'name')
      .populate('assignedProductionUnit', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: users,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      // Hierarchy check
      const requesterRole = req.user.role;
      if (requesterRole === 'admin' && (user.role === 'superadmin' || user.role === 'admin')) {
        return res.status(403).json({ message: 'Unauthorized to update this user' });
      }
      if (requesterRole === 'prod_manager' && user.role !== 'salesperson') {
        return res.status(403).json({ message: 'Unauthorized to update this user' });
      }

      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.assignedCanteen = req.body.assignedCanteen || null;
      user.assignedProductionUnit = req.body.assignedProductionUnit || null;
      
      if (req.body.password) {
        user.password = req.body.password;
      }
      user.updatedBy = req.user.email;

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      // Hierarchy check
      const requesterRole = req.user.role;
      if (user.role === 'superadmin') {
        return res.status(400).json({ message: 'Cannot delete superadmin' });
      }
      if (requesterRole === 'admin' && user.role === 'admin') {
        return res.status(403).json({ message: 'Admins cannot delete other admins' });
      }
      if (requesterRole === 'prod_manager' && user.role !== 'salesperson') {
        return res.status(403).json({ message: 'Unauthorized to delete this user' });
      }

      // Since Sales module is deleted, we remove the dependency check

      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, updateUser, deleteUser };
