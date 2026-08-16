const mongoose = require('mongoose');
const Transfer = require('../models/Transfer');
const Stock = require('../models/Stock');
const DailyStock = require('../models/DailyStock');
const ProductionUnit = require('../models/ProductionUnit');
const Canteen = require('../models/Canteen');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Initiate a transfer
// @route   POST /api/transfers
// @access  Private (Admin/Pro Manager/Sales person depending on direction)
const initiateTransfer = async (req, res) => {
  try {
    let { fromLocation, toLocation, products, transferType } = req.body;

    // ROLE-BASED ACCESS: Ensure non-admin users only initiate FROM their assigned location
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const isSalesPersonFromMatch = req.user.role === 'salesperson' && fromLocation.id.toString() === req.user.assignedCanteen?.toString();
      const isManagerFromMatch = req.user.role === 'prod_manager' && fromLocation.id.toString() === req.user.assignedProductionUnit?.toString();

      if (!isSalesPersonFromMatch && !isManagerFromMatch) {
        return res.status(403).json({ message: 'Forbidden: You can only initiate transfers from your assigned location' });
      }
    }

    // Sanitize products to remove empty dailyStockId strings
    if (products && Array.isArray(products)) {
      products = products.map(p => {
        const product = { ...p };
        if (!product.dailyStockId || product.dailyStockId === '') {
          delete product.dailyStockId;
        }
        return product;
      });
    }

    if (!fromLocation || !toLocation || !products || !products.length || !transferType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate stock availability at the source (simple product+location check)
    for (const item of products) {
      const stock = await Stock.findOne({
        productId: item.productId,
        locationId: fromLocation.id,
        locationType: fromLocation.type
      });

      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product. Available: ${stock ? stock.quantity : 0}`
        });
      }
    }

    const transfer = await Transfer.create({
      fromLocation,
      toLocation,
      products,
      transferType,
      initiatedBy: req.user._id,
      overallStatus: 'pending',
      createdBy: req.user.email,
      updatedBy: req.user.email
    });

    // Emit event
    // Emit event: transfer:new
    const io = req.app.get('socketio');
    io.emit('transfer:new', transfer);

    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Accept or Reject items in a transfer
// @route   PUT /api/transfers/:id/accept
// @access  Private
const acceptTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { products: itemUpdates } = req.body; // Array of { productId, acceptedQty, damageQty, rejectedQty, remark }

    const transfer = await Transfer.findById(id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    // ROLE-BASED ACCESS: Ensure ONLY the destination location can accept the transfer
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const isSalesPersonDestMatch = req.user.role === 'salesperson' && transfer.toLocation.id.toString() === req.user.assignedCanteen?.toString();
      const isManagerDestMatch = req.user.role === 'prod_manager' && transfer.toLocation.id.toString() === req.user.assignedProductionUnit?.toString();

      if (!isSalesPersonDestMatch && !isManagerDestMatch) {
        return res.status(403).json({ message: 'Forbidden: You can only accept transfers for your assigned location' });
      }
    }

    if (transfer.overallStatus === 'completed') {
      return res.status(400).json({ message: 'Transfer already completed' });
    }

    for (const update of itemUpdates) {
      const productInTransfer = transfer.products.find(p => p.productId.toString() === update.productId);
      if (productInTransfer) {
        productInTransfer.acceptedQuantity = update.acceptedQty;
        productInTransfer.damagedQuantity = update.damageQty;
        productInTransfer.rejectedQuantity = update.rejectedQty;
        productInTransfer.missingQuantity = update.missingQty || 0;
        productInTransfer.status = update.status || 'accepted';
        productInTransfer.remark = update.remark || '';

        // Update Stock Logic
        if (update.acceptedQty > 0 || update.damageQty > 0 || (update.missingQty > 0)) {
          const totalOut = (Number(update.acceptedQty) || 0) + (Number(update.damageQty) || 0) + (Number(update.missingQty) || 0);

          // Fetch prices from source stock to propagate
          const sourceStockData = await Stock.findOne({
            productId: update.productId,
            locationId: transfer.fromLocation.id,
            locationType: transfer.fromLocation.type
          });

          // 1. Increase stock in TO location & accumulate (no batch key — qty adds up)
          await Stock.findOneAndUpdate(
            {
              productId: update.productId,
              locationId: transfer.toLocation.id,
              locationType: transfer.toLocation.type
            },
            {
              $inc: {
                quantity: Number(update.acceptedQty) || 0,
                damagedQuantity: Number(update.damageQty) || 0
              },
              $set: {
                status: 'onstock',
                categoryId: productInTransfer.categoryId,
                costPrice: sourceStockData?.costPrice || 0,
                price: sourceStockData?.price || 0,
                sourceLocationId: transfer.fromLocation.id,
                sourceLocationType: transfer.fromLocation.type
              }
            },
            { upsert: true }
          );

          // 2. Deduct from SOURCE location stock
          const sourceStock = await Stock.findOneAndUpdate(
            {
              productId: update.productId,
              locationId: transfer.fromLocation.id,
              locationType: transfer.fromLocation.type
            },
            {
              $inc: {
                quantity: -totalOut,
                transferQty: totalOut
              },
              $set: {
                categoryId: productInTransfer.categoryId
              }
            },
            { new: true }
          );

          // 3. Update DailyStock for production audit/reporting
          // Use the savedDailyStockId from the transfer record (for report use only)
          if (productInTransfer.dailyStockId) {
            const targetDailyStock = await DailyStock.findById(productInTransfer.dailyStockId);
            if (targetDailyStock) {
              const prodIdx = targetDailyStock.products.findIndex(p => p.productId.toString() === update.productId.toString());
              if (prodIdx !== -1) {
                // Track transferred qty on DailyStock for reporting
                targetDailyStock.products[prodIdx].transferQty = (targetDailyStock.products[prodIdx].transferQty || 0) + totalOut;
                if (update.damageQty > 0) {
                  targetDailyStock.products[prodIdx].damagedQty = (targetDailyStock.products[prodIdx].damagedQty || 0) + Number(update.damageQty);
                }
                if (!targetDailyStock.products[prodIdx].categoryId) {
                  targetDailyStock.products[prodIdx].categoryId = productInTransfer.categoryId;
                }
                await targetDailyStock.save();
              }
            }
          }
        }
      }
    }

    transfer.overallStatus = 'completed';
    await transfer.save();

    // 3. Write Audit Ledger (Transactions) & Check Low Stock
    const io = req.app.get('socketio');

    for (const update of itemUpdates) {
      if (update.status === 'rejected') {
        // No stock movement for rejected items, maybe log as a failed sync
        continue;
      }

      // Record Ledger: Transfer Out (Source)
      const productInTransfer = transfer.products.find(p => p.productId.toString() === update.productId);

      await Transaction.create({
        transactionType: 'Transfer_Out',
        productId: update.productId,
        categoryId: productInTransfer?.categoryId,
        dailyStockId: productInTransfer?.dailyStockId, // Propagate batch
        quantity: (Number(update.acceptedQty) || 0) + (Number(update.damageQty) || 0) + (Number(update.missingQty) || 0),
        fromLocation: { id: transfer.fromLocation.id, type: transfer.fromLocation.type },
        toLocation: { id: transfer.toLocation.id, type: transfer.toLocation.type },
        performedBy: req.user._id,
        referenceId: transfer._id,
        remark: update.remark || `Source deduction for Transfer #${transfer._id.toString().slice(-6)}`
      });

      // Record Ledger: Transfer In (Destination)
      if (update.acceptedQty > 0 || update.damageQty > 0) {
        await Transaction.create({
          transactionType: 'Transfer_In',
          productId: update.productId,
          categoryId: productInTransfer?.categoryId,
          dailyStockId: productInTransfer?.dailyStockId, // Propagate batch
          quantity: (Number(update.acceptedQty) || 0) + (Number(update.damageQty) || 0),
          fromLocation: { id: transfer.fromLocation.id, type: transfer.fromLocation.type },
          toLocation: { id: transfer.toLocation.id, type: transfer.toLocation.type },
          performedBy: req.user._id,
          referenceId: transfer._id,
          remark: update.remark || `Destination addition for Transfer #${transfer._id.toString().slice(-6)}`
        });
      }

      // Check for Low Stock post-acceptance
      const sourceStock = await Stock.findOne({
        productId: update.productId,
        locationId: transfer.fromLocation.id,
        dailyStockId: productInTransfer?.dailyStockId // Batch-specific check
      });
      if (sourceStock && sourceStock.quantity < sourceStock.lowStockThreshold) {
        io.emit('stock:low-alert', {
          productId: update.productId,
          locationId: transfer.fromLocation.id,
          quantity: sourceStock.quantity,
          threshold: sourceStock.lowStockThreshold
        });
      }
    }

    // Emit event: transfer:accepted and completed for dashboard
    io.emit('transfer:accepted', transfer);
    io.emit('TRANSFER_COMPLETED', transfer);
    io.emit('dashboard:stats-update', { type: 'TRANSFER', status: 'completed' });

    res.json(transfer);
  } catch (error) {
    console.error('AcceptTransfer Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get transfers related to user or location
// @route   GET /api/transfers
const getTransfers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status;
    const type = req.query.type;
    const locationId = req.query.locationId;

    const skip = (page - 1) * limit;

    const query = {};

    // Base query logic - Enforce role-based isolation
    if (req.user.role === 'salesperson') {
      const userCanteen = req.user.assignedCanteen?.toString();
      query.$or = [{ 'fromLocation.id': userCanteen }, { 'toLocation.id': userCanteen }];
    } else if (req.user.role === 'prod_manager') {
      const userUnit = req.user.assignedProductionUnit?.toString();
      query.$or = [{ 'fromLocation.id': userUnit }, { 'toLocation.id': userUnit }];
    } else if (locationId) {
      // Only admin can filter by arbitrary locationId
      query.$or = [{ 'fromLocation.id': locationId }, { 'toLocation.id': locationId }];
    }

    if (status) query.overallStatus = status;
    if (type) query.transferType = type;

    // Search Logic (by product name/code or Transfer ID)
    if (search) {
      // Find products matching keyword
      const productIds = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { productCode: { $regex: search, $options: 'i' } }
        ]
      }).distinct('_id');

      const searchQuery = {
        $or: [
          { 'products.productId': { $in: productIds } }
        ]
      };

      // Check if search term is a valid MongoDB ID for transfer ID search
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchQuery.$or.push({ _id: search });
      }

      // Merge into the main query
      if (query.$or) {
        // If there's already an $or (location-based), we need to $and them
        query.$and = [
          { $or: query.$or },
          searchQuery
        ];
        delete query.$or;
      } else {
        query.$or = searchQuery.$or;
      }
    }

    const total = await Transfer.countDocuments(query);
    const transfers = await Transfer.find(query)
      .populate('fromLocation.id', 'name')
      .populate('toLocation.id', 'name')
      .populate('products.productId', 'name productCode uom')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    const safeTransfers = transfers.map(t => ({
      ...t,
      fromLocation: {
        ...t.fromLocation,
        id: t.fromLocation?.id || { name: 'System / Unknown' }
      },
      toLocation: {
        ...t.toLocation,
        id: t.toLocation?.id || { name: 'Warehouse / Unknown' }
      }
    }));

    res.json({
      data: safeTransfers,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Transfer Load Error:', error);
    res.status(500).json({ message: 'Error loading transfers', error: error.message });
  }
};

// @desc    Get transfer by ID
// @route   GET /api/transfers/:id
// @access  Private
const getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('fromLocation.id', 'name')
      .populate('toLocation.id', 'name')
      .populate('products.productId', 'name productCode uom');

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    // ROLE-BASED ACCESS: Ensure the transfer involves the user's location
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const userLoc = req.user.role === 'salesperson' ? req.user.assignedCanteen?.toString() : req.user.assignedProductionUnit?.toString();
      if (transfer.fromLocation.id?._id?.toString() !== userLoc && transfer.toLocation.id?._id?.toString() !== userLoc) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this transfer' });
      }
    }

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update a pending transfer
// @route   PUT /api/transfers/:id
// @access  Private
const updateTransfer = async (req, res) => {
  try {
    let { fromLocation, toLocation, products, transferType } = req.body;

    // Sanitize products to remove empty dailyStockId strings
    if (products && Array.isArray(products)) {
      products = products.map(p => {
        const product = { ...p };
        if (!product.dailyStockId || product.dailyStockId === '') {
          delete product.dailyStockId;
        }
        return product;
      });
    }

    const transfer = await Transfer.findById(req.params.id);

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    if (transfer.overallStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending transfers can be updated' });
    }

    // Refresh stock check
    for (const item of products) {
      const stock = await Stock.findOne({
        productId: item.productId,
        locationId: fromLocation.id,
        locationType: fromLocation.type
      });

      if (!stock || stock.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.productId}. Available: ${stock ? stock.quantity : 0}`
        });
      }
    }

    transfer.fromLocation = fromLocation || transfer.fromLocation;
    transfer.toLocation = toLocation || transfer.toLocation;
    transfer.products = products || transfer.products;
    transfer.transferType = transferType || transfer.transferType;
    transfer.updatedBy = req.user.email;

    await transfer.save();
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a pending transfer
// @route   DELETE /api/transfers/:id
// @access  Private
const deleteTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    if (transfer.overallStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending transfers can be deleted' });
    }

    await transfer.deleteOne();
    res.json({ message: 'Transfer removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  initiateTransfer,
  acceptTransfer,
  getTransfers,
  getTransferById,
  updateTransfer,
  deleteTransfer
};
