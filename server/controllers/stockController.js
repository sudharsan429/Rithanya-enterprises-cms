const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const DailyStock = require('../models/DailyStock');
const Product = require('../models/Product');
const Transfer = require('../models/Transfer');
const Sale = require('../models/Sale');
const Transaction = require('../models/Transaction');

// @desc    Add or Update Daily Stock
// @route   POST /api/stock/daily
// @access  Private (Admin/Pro Manager)
const addDailyStock = async (req, res) => {
  try {
    const { date, productionUnitId, products } = req.body;

    if (!date || !productionUnitId || !products || !products.length) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const entryDate = new Date(date).setHours(0, 0, 0, 0);
    const normalizedProducts = products.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      costPrice: Number(item.costPrice),
      price: Number(item.price) || 0,
      lowStockThreshold: Number(item.lowStockThreshold) || 0
    }));

    // 1. Create or Update DailyStock record by merging products for the same date/unit
    const existingEntry = await DailyStock.findOne({ date: entryDate, productionUnitId });
    const previousProductsMap = new Map(
      (existingEntry?.products || []).map((item) => [item.productId.toString(), item])
    );
    const mergedProductsMap = new Map(previousProductsMap);

    normalizedProducts.forEach((item) => {
      const key = item.productId.toString();
      const existingProduct = mergedProductsMap.get(key);

      if (existingProduct) {
        const existingProductData = typeof existingProduct.toObject === 'function'
          ? existingProduct.toObject()
          : existingProduct;

        mergedProductsMap.set(key, {
          ...existingProductData,
          productId: existingProduct.productId,
          categoryId: item.categoryId,
          quantity: Number(existingProduct.quantity || 0) + item.quantity,
          costPrice: item.costPrice,
          price: item.price,
          lowStockThreshold: item.lowStockThreshold,
          status: item.status || existingProduct.status || 'onstock'
        });
      } else {
        mergedProductsMap.set(key, {
          ...item,
          transferQty: Number(item.transferQty) || 0,
          soldQty: Number(item.soldQty) || 0,
          damagedQty: Number(item.damagedQty) || 0,
          status: item.status || 'onstock'
        });
      }
    });

    const mergedProducts = Array.from(mergedProductsMap.values());

    const dailyStock = await DailyStock.findOneAndUpdate(
      { date: entryDate, productionUnitId },
      {
        $set: {
          products: mergedProducts,
          totalStock: mergedProducts.reduce((acc, p) => acc + Number(p.quantity), 0),
          totalRevenue: mergedProducts.reduce((acc, p) => acc + (Number(p.quantity) * Number(p.costPrice)), 0),
          updatedBy: req.user.email
        },
        $setOnInsert: {
          createdBy: req.user.email
        }
      },
      { upsert: true, new: true }
    );

    // 2. Update real-time Stock & Record Transactions only for newly added quantities
    for (const item of normalizedProducts) {
      const previousItem = previousProductsMap.get(item.productId.toString());
      const quantityDelta = item.quantity;

      await Stock.findOneAndUpdate(
        { 
          productId: item.productId, 
          locationId: productionUnitId, 
          locationType: 'ProductionUnit'
        },
        { 
          $inc: { quantity: Number(item.quantity) },
          $set: { 
            categoryId: item.categoryId,
            costPrice: Number(item.costPrice),
            price: Number(item.price) || 0,
            lowStockThreshold: Number(item.lowStockThreshold) || 0,
            sourceLocationId: productionUnitId,
            sourceLocationType: 'ProductionUnit',
            dailyStockId: dailyStock._id,
            status: 'onstock',
            updatedBy: req.user?.email || 'System'
          }
        },
        { upsert: true }
      );

      // Auditing Ledger Entry
      await Transaction.create({
        transactionType: 'Adjustment',
        productId: item.productId,
        categoryId: item.categoryId,
        quantity: quantityDelta,
        dailyStockId: dailyStock._id,
        fromLocation: { id: productionUnitId, type: 'ProductionUnit' },
        performedBy: req.user._id,
        referenceId: dailyStock._id,
        remark: previousItem ? 'Production Stock Added To Existing Entry' : 'Initial Production Recording'
      });
    }

    // 3. Emit Socket event
    const io = req.app.get('socketio');
    io.emit('STOCK_UPDATED', { productionUnitId, date });
    io.emit('dashboard:stats-update', { type: 'STOCK', action: 'produced' });

    res.status(201).json({ message: 'Daily stock updated successfully', dailyStock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Helper: Check if stock has been moved/transferred after daily stock entry
const checkIfTransferred = async (productionUnitId, sinceDate) => {
  const transferCount = await Transfer.countDocuments({
    'fromLocation.id': productionUnitId,
    createdAt: { $gt: sinceDate },
    overallStatus: { $in: ['in_transit', 'completed'] }
  });

  return transferCount > 0;
};

// @desc    Get Daily Stock Entries with Locking Status
// @route   GET /api/stock/daily
const getDailyStock = async (req, res) => {
  try {
    const { date, productionUnitId, all } = req.query;
    const query = {};
    // Role-based filtering
    if (req.user.role === 'prod_manager') {
      if (!req.user.assignedProductionUnit) {
        return res.status(403).json({ message: 'Production Manager has no assigned unit' });
      }
      query.productionUnitId = req.user.assignedProductionUnit;
    }

    if (date) {
      query.date = new Date(date).setHours(0, 0, 0, 0);
    } else if (all !== 'true') {
      const now = new Date();
      if (now.getHours() < 3) now.setDate(now.getDate() - 1);
      query.date = new Date(now).setHours(0, 0, 0, 0);
    }

    if (productionUnitId) query.productionUnitId = productionUnitId;

    const entries = await DailyStock.find(query)
      .populate('productionUnitId', 'name text color')
      .populate('products.productId', 'name productCode uom price')
      .sort({ date: -1, createdAt: -1 });

    // Extend entries with isLocked status and actual performance metrics
    const result = await Promise.all(entries.map(async (entry) => {
      const isLocked = await checkIfTransferred(entry.productionUnitId._id, entry.createdAt);
      
      // Calculate Actual Sales (Outbound Transfers) for this date
      const startOfDay = new Date(entry.date).setHours(0,0,0,0);
      const endOfDay = new Date(entry.date).setHours(23,59,59,999);

      const transfers = await Transfer.find({
        'fromLocation.id': entry.productionUnitId._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        overallStatus: { $in: ['in_transit', 'completed'] }
      });

      let actualSaleQty = 0;
      let actualRevenue = 0;

      transfers.forEach(t => {
        t.products.forEach(p => {
          actualSaleQty += p.quantity;
          // Match with DailyStock product to get costPrice for revenue calculation
          const stockProduct = entry.products.find(sp => sp.productId._id.toString() === p.productId.toString());
          if (stockProduct) {
            actualRevenue += (p.quantity * stockProduct.costPrice);
          }
        });
      });

      return { 
        ...entry.toObject(), 
        isLocked,
        actualSaleQty,
        actualRevenue
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('getDailyStock Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get Daily Stock Entry by ID
// @route   GET /api/stock/daily/:id
const getDailyStockById = async (req, res) => {
  try {
    const entry = await DailyStock.findById(req.params.id)
      .populate('productionUnitId', 'name')
      .populate('products.productId', 'name productCode uom price');

    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const isLocked = await checkIfTransferred(entry.productionUnitId._id, entry.createdAt);
    
    res.json({ ...entry.toObject(), isLocked });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update Daily Stock
// @route   PUT /api/stock/daily/:id
const updateDailyStock = async (req, res) => {
  try {
    const { products } = req.body;
    const entry = await DailyStock.findById(req.params.id);

    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    // 1. Safety check
    const isLocked = await checkIfTransferred(entry.productionUnitId, entry.createdAt);
    if (isLocked) {
      return res.status(400).json({ message: 'Cannot update: Stock from this entry has already been transferred' });
    }

    // 2. Audit and Adjust Stock deltas
    // We handle all products from both old and new lists to find deletions, additions, and updates
    const oldProductsMap = new Map(entry.products.map(p => [p.productId.toString(), p]));
    const newProductsMap = new Map(products.map(p => [p.productId.toString(), p]));
    const allProductIds = new Set([...oldProductsMap.keys(), ...newProductsMap.keys()]);

    for (const pId of allProductIds) {
      const oldItem = oldProductsMap.get(pId);
      const newItem = newProductsMap.get(pId);
      
      const oldQty = Number(oldItem?.quantity || 0);
      const newQty = Number(newItem?.quantity || 0);
      const delta = newQty - oldQty;

      if (delta !== 0) {
        // Update Stock Table
        await Stock.findOneAndUpdate(
          { productId: pId, locationId: entry.productionUnitId, locationType: 'ProductionUnit' },
          { 
            $inc: { quantity: delta },
            $set: { 
               categoryId: newItem?.categoryId || oldItem?.categoryId,
               costPrice: Number(newItem?.costPrice || oldItem?.costPrice),
               price: Number(newItem?.price || oldItem?.price || 0),
               updatedBy: req.user?.email || 'System'
            }
          },
          { upsert: true }
        );

        // Record Adjustment in Ledger
        await Transaction.create({
          transactionType: 'Adjustment',
          productId: pId,
          categoryId: newItem?.categoryId || oldItem?.categoryId,
          quantity: delta,
          dailyStockId: entry._id,
          fromLocation: { id: entry.productionUnitId, type: 'ProductionUnit' },
          performedBy: req.user._id,
          referenceId: entry._id,
          remark: delta > 0 ? `Production Adjustment: Increased by ${delta}` : `Production Adjustment: Decreased by ${Math.abs(delta)}`
        });
      }
    }

    // 3. Update DailyStock record
    entry.products = products;
    entry.totalStock = products.reduce((acc, p) => acc + Number(p.quantity), 0);
    entry.totalRevenue = products.reduce((acc, p) => acc + (Number(p.quantity) * Number(p.costPrice)), 0);
    entry.updatedBy = req.user?.email;
    await entry.save();

    res.json({ message: 'Stock entry updated', entry });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete Daily Stock
// @route   DELETE /api/stock/daily/:id
const deleteDailyStock = async (req, res) => {
  try {
    const entry = await DailyStock.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    // 1. Safety check
    const isLocked = await checkIfTransferred(entry.productionUnitId, entry.createdAt);
    if (isLocked) {
      return res.status(400).json({ message: 'Cannot delete: Stock from this entry has already been transferred' });
    }

    // 2. Reverse Stock and Record Reversals
    for (const item of entry.products) {
      await Stock.findOneAndUpdate(
        { productId: item.productId, locationId: entry.productionUnitId },
        { $inc: { quantity: -Number(item.quantity) } }
      );

      // Ledger: Negative Adjustment for deletion
      await Transaction.create({
        transactionType: 'Adjustment',
        productId: item.productId,
        categoryId: item.categoryId,
        quantity: -Number(item.quantity),
        dailyStockId: entry._id,
        fromLocation: { id: entry.productionUnitId, type: 'ProductionUnit' },
        performedBy: req.user._id,
        referenceId: entry._id,
        remark: 'Production Record DELETED'
      });
    }

    // 3. Delete Record
    await entry.deleteOne();

    res.json({ message: 'Stock entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get Real-time Stock levels
// @route   GET /api/stock/levels
// @access  Private
const getStockLevels = async (req, res) => {
  try {
    const { locationId, locationType, aggregate } = req.query;
    const query = {};
    
    // Convert to ObjectId for aggregation if present
    if (locationId) query.locationId = new mongoose.Types.ObjectId(locationId);
    if (locationType) query.locationType = locationType;

    if (aggregate === 'true') {
      const levels = await Stock.aggregate([
        { $match: query },
        { 
          $group: { 
            _id: '$productId', 
            quantity: { $sum: '$quantity' },
            transferQty: { $sum: '$transferQty' },
            soldQty: { $sum: '$soldQty' },
            damagedQty: { $sum: '$damagedQty' },
            price: { $first: '$price' },
            costPrice: { $first: '$costPrice' },
            categoryId: { $first: '$categoryId' }
          } 
        },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productId' } },
        { $unwind: '$productId' },
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryId' } },
        { $unwind: { path: '$categoryId', preserveNullAndEmptyArrays: true } }
      ]);
      return res.json(levels);
    }

    const levels = await Stock.find(query)
      .populate('productId', 'name productCode uom price category _id')
      .populate('sourceLocationId', 'name')
      .populate('dailyStockId', 'date createdAt');
    res.json(levels);
  } catch (error) {
    console.error('getStockLevels Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
const migrateStockSource = async (req, res) => {
  try {
    const untracked = await Stock.find({ sourceLocationId: { $exists: false } });
    let count = 0;

    for (const s of untracked) {
      if (s.locationType === 'ProductionUnit') {
        s.sourceLocationId = s.locationId;
        s.sourceLocationType = 'ProductionUnit';
        await s.save();
        count++;
      } else if (s.locationType === 'Canteen') {
        // Find most recent transfer for this product to this canteen
        const lastTransfer = await Transfer.findOne({
          'products.productId': s.productId,
          'toLocation.id': s.locationId,
          overallStatus: 'completed'
        }).sort({ createdAt: -1 });

        if (lastTransfer) {
          s.sourceLocationId = lastTransfer.fromLocation.id;
          s.sourceLocationType = lastTransfer.fromLocation.type;
          await s.save();
          count++;
        }
      }
    }

    res.json({ message: `Successfully patched ${count} stock records.`, totalUntrackedRemaining: untracked.length - count });
  } catch (error) {
    res.status(500).json({ message: 'Migration failed', error: error.message });
  }
};

module.exports = {
  addDailyStock,
  getDailyStock,
  getDailyStockById,
  updateDailyStock,
  deleteDailyStock,
  getStockLevels,
  migrateStockSource
};
