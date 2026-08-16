const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  try {
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: categories,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin/Superadmin/Prod Manager)
const createCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    const category = await Category.create({ 
      name, 
      description,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin/Superadmin/Prod Manager)
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      category.name = req.body.name || category.name;
      category.description = req.body.description || category.description;
      category.updatedBy = req.user.email;
      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

const Product = require('../models/Product');

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin/Superadmin)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      // Check for products
      const productCount = await Product.countDocuments({ category: category._id });
      if (productCount > 0) {
        return res.status(400).json({ message: 'Cannot delete category with associated products' });
      }

      await category.deleteOne();
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
