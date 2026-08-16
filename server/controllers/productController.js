const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  try {
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ name: 1, productCode: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: products,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin/Superadmin/Prod Manager)
const createProduct = async (req, res) => {
  const { name, productCode, category, price, lowStock, uom } = req.body;

  try {
    const product = await Product.create({
      name,
      productCode,
      category,
      price: Math.abs(price),
      lowStock: Math.abs(lowStock || 0),
      uom: uom || 'pc',
      createdBy: req.user.email,
      updatedBy: req.user.email
    });
    const populatedProduct = await Product.findById(product._id).populate('category', 'name');
    res.status(201).json(populatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field === 'productCode' ? 'Product Code' : 'Product name'} already exists` });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin/Superadmin/Prod Manager)
const updateProduct = async (req, res) => {
  const { name, productCode, category, price, lowStock, uom } = req.body;
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.name = name || product.name;
      product.productCode = productCode || product.productCode;
      product.category = category || product.category;
      product.price = price !== undefined ? Math.abs(price) : product.price;
      product.lowStock = lowStock !== undefined ? Math.abs(lowStock) : product.lowStock;
      product.uom = uom || product.uom;
      product.updatedBy = req.user.email;

      const updatedProduct = await product.save();
      const populatedProduct = await Product.findById(updatedProduct._id).populate('category', 'name');
      res.json(populatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field === 'productCode' ? 'Product Code' : 'Product name'} already exists` });
    }
    res.status(400).json({ message: error.message });
  }
};



// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin/Superadmin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {

      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
