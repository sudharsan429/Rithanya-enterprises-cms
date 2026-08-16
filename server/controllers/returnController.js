const Return = require('../models/Return');
const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');
const DailyStock = require('../models/DailyStock');

// @desc    Initiate a return
// @route   POST /api/returns
// @access  Private
const initiateReturn = async (req, res) => {
  try {
    const { type, locationId, locationType, products, targetLocationId, targetLocationType, notes, date } = req.body;

    // Basic validation
    if (!type || !locationId || !locationType || !products || !products.length) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Type-specific validation
    if (type === 'unsold' && (!targetLocationId || !targetLocationType)) {
      return res.status(400).json({ message: 'Target location is required for unsold returns' });
    }

    // Product item validation
    const invalidProduct = products.find(p => !p.productId || !p.categoryId || !p.quantity || !p.reason);
    if (invalidProduct) {
      return res.status(400).json({ message: 'Each product must have a productId, categoryId, quantity, and reason' });
    }

    // All returns now start as pending and require approval
    const status = 'pending';

    const returnRecord = await Return.create({
      type,
      locationId,
      locationType,
      targetLocationId,
      targetLocationType,
      products: products.map(p => ({
        ...p,
        dailyStockId: p.dailyStockId // Batch-specific tracking
      })),
      notes,
      date: date || new Date(),
      status,
      initiatedBy: req.user._id,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });

    // Stock updates based on return type
    for (const item of products) {
      // 1. DEDUCT FROM SOURCE (Canteen)
      let sourceField = (type === 'damage' || type === 'unsold') ? 'quantity' : 'damagedQuantity';
      if (type === 'expiry') {
         // Special handling for expiry decrement
         const stockRecord = await Stock.findOne({ 
           productId: item.productId, 
           locationId, 
           locationType,
           dailyStockId: item.dailyStockId, // Batch-specific check
           sourceLocationId: targetLocationId,
           sourceLocationType: targetLocationType
         });
         if (stockRecord) {
             let qtyToDeduct = item.quantity;
             let decr = {};
             if (stockRecord.quantity >= qtyToDeduct) { decr.quantity = -qtyToDeduct; } 
             else { const rem = qtyToDeduct - stockRecord.quantity; decr.quantity = -stockRecord.quantity; decr.damagedQuantity = -rem; }
             await Stock.updateOne({ _id: stockRecord._id }, { $inc: decr });
         }
      } else {
        await Stock.findOneAndUpdate(
          { 
            productId: item.productId, 
            locationId, 
            locationType,
            dailyStockId: item.dailyStockId, // Batch-specific check
            sourceLocationId: targetLocationId,
            sourceLocationType: targetLocationType
          },
          { 
            $inc: { [sourceField]: -item.quantity },
            $set: { categoryId: item.categoryId }
          }
        );
      }

      // Record Transaction: Return Out
      await Transaction.create({
        transactionType: 'Return',
        productId: item.productId,
        categoryId: item.categoryId,
        dailyStockId: item.dailyStockId, // Propagate batch
        quantity: item.quantity,
        fromLocation: { id: locationId, type: locationType },
        toLocation: { id: targetLocationId, type: targetLocationType },
        performedBy: req.user._id,
        referenceId: returnRecord._id,
        remark: `${type.toUpperCase()} Return initiated. Reason: ${item.reason}`
      });

      // 2. INCREMENT TARGET (Production Unit) - Only for auto-approved
      if (status === 'approved') {
        const targetBucket = (type === 'unsold') ? 'quantity' : 'damagedQuantity';
        await Stock.findOneAndUpdate(
          { 
            productId: item.productId, 
            locationId: targetLocationId, 
            locationType: targetLocationType,
            dailyStockId: item.dailyStockId, // Maintain batch link
            sourceLocationId: targetLocationId,
            sourceLocationType: targetLocationType
          },
          { 
            $inc: { [targetBucket]: item.quantity },
            $set: {
              categoryId: item.categoryId,
              sourceLocationId: targetLocationId,
              sourceLocationType: targetLocationType
            }
          },
          { upsert: true }
        );

        // Record Transaction: Return In
        await Transaction.create({
          transactionType: 'Return',
          productId: item.productId,
          categoryId: item.categoryId,
          dailyStockId: item.dailyStockId, // Propagate batch
          quantity: item.quantity,
          fromLocation: { id: locationId, type: locationType },
          toLocation: { id: targetLocationId, type: targetLocationType },
          performedBy: req.user._id,
          referenceId: returnRecord._id,
          remark: `${type.toUpperCase()} Return accepted into Production Unit bucket: ${targetBucket}`
        });
      }
    }

    res.status(201).json(returnRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Approve or Reject a return (Unsold)
// @route   PUT /api/returns/:id/status
// @access  Private
const updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const returnRecord = await Return.findById(id);
    if (!returnRecord) return res.status(404).json({ message: 'Return record not found' });
    if (returnRecord.status !== 'pending') return res.status(400).json({ message: 'Record already processed' });

    returnRecord.status = status;
    returnRecord.updatedBy = req.user.email;
    await returnRecord.save();

    for (const item of returnRecord.products) {
      if (status === 'approved') {
        // Increment target location stock
        const targetBucket = (returnRecord.type === 'unsold') ? 'quantity' : 'damagedQuantity';
        
        await Stock.findOneAndUpdate(
          { 
            productId: item.productId, 
            locationId: returnRecord.targetLocationId, 
            locationType: returnRecord.targetLocationType,
            sourceLocationId: returnRecord.targetLocationId,
            sourceLocationType: returnRecord.targetLocationType
          },
          { 
            productId: item.productId, 
            locationId: returnRecord.targetLocationId, 
            locationType: returnRecord.targetLocationType,
            dailyStockId: item.dailyStockId // Specific batch
          },
          { 
            $inc: { [targetBucket]: item.quantity },
            $set: {
              categoryId: item.categoryId,
              sourceLocationId: returnRecord.targetLocationId,
              sourceLocationType: returnRecord.targetLocationType
            }
          },
          { upsert: true }
        );

        // Decrement activity count in originating DailyStock (Traceability)
        if (item.dailyStockId) {
          const dStock = await DailyStock.findById(item.dailyStockId);
          if (dStock) {
             const pIdx = dStock.products.findIndex(p => p.productId.toString() === item.productId.toString());
             if (pIdx !== -1) {
                // If it was unsold, it was a transfer that didn't happen/completing.
                // If it was damaged/expired at canteen, it still counts as a "transfer" that left PU,
                // but if it's coming BACK to PU physical stock, we should decrement transferQty.
                if (returnRecord.type === 'unsold') {
                   dStock.products[pIdx].transferQty = Math.max(0, (dStock.products[pIdx].transferQty || 0) - item.quantity);
                } else if (returnRecord.type === 'damage' || returnRecord.type === 'expiry') {
                   // These were transferred then documented as damaged at the destination.
                   // If they come back to PU, they are effectively back in PU's "damaged" bucket.
                   dStock.products[pIdx].transferQty = Math.max(0, (dStock.products[pIdx].transferQty || 0) - item.quantity);
                   // If recorded as damage at PU now, increment damagedQty
                   dStock.products[pIdx].damagedQty = (dStock.products[pIdx].damagedQty || 0) + item.quantity;
                }
                
                // Recalculate totals
                dStock.totalStock = dStock.products.reduce((acc, p) => acc + (p.quantity || 0), 0);
                dStock.totalRevenue = dStock.products.reduce((acc, p) => acc + ((p.quantity || 0) * (p.costPrice || 0)), 0);
                
                await dStock.save();
             }
          }
        }

        // Record Transaction: Return In
        await Transaction.create({
          transactionType: 'Return',
          productId: item.productId,
          categoryId: item.categoryId,
          dailyStockId: item.dailyStockId, // Propagate batch
          quantity: item.quantity,
          fromLocation: { id: returnRecord.locationId, type: returnRecord.locationType },
          toLocation: { id: returnRecord.targetLocationId, type: returnRecord.targetLocationType },
          performedBy: req.user._id,
          referenceId: returnRecord._id,
          remark: `${returnRecord.type.toUpperCase()} Return approved and reconciled in Production Unit batch`
        });
      } 
      else if (status === 'rejected') {
        // Restore stock in source Canteen
        const fieldToIncrement = (returnRecord.type === 'damage') ? 'damagedQuantity' : 'quantity';
        await Stock.findOneAndUpdate(
          { 
            productId: item.productId, 
            locationId: returnRecord.locationId, 
            locationType: returnRecord.locationType,
            dailyStockId: item.dailyStockId, // Specific batch
            sourceLocationId: returnRecord.targetLocationId,
            sourceLocationType: returnRecord.targetLocationType
          },
          { 
            $inc: { [fieldToIncrement]: item.quantity },
            $set: { status: 'onstock', categoryId: item.categoryId }
          },
          { upsert: true }
        );

        // Record Transaction: Restoration (Outbound return was cancelled)
        await Transaction.create({
          transactionType: 'Adjustment',
          productId: item.productId,
          categoryId: item.categoryId,
          dailyStockId: item.dailyStockId, // Propagate batch
          quantity: item.quantity,
          fromLocation: { id: returnRecord.targetLocationId, type: returnRecord.targetLocationType },
          toLocation: { id: returnRecord.locationId, type: returnRecord.locationType },
          performedBy: req.user._id,
          referenceId: returnRecord._id,
          remark: `Return REJECTED. Stock restored to Canteen ${fieldToIncrement} bucket.`
        });
      }
    }

    res.json(returnRecord);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get returns history
// @route   GET /api/returns
const getReturns = async (req, res) => {
  try {
    const { locationId, type, targetLocationId, status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    if (locationId && targetLocationId) {
      query.$or = [{ locationId }, { targetLocationId }];
    } else {
      if (locationId) query.locationId = locationId;
      if (targetLocationId) query.targetLocationId = targetLocationId;
    }

    const total = await Return.countDocuments(query);
    const returns = await Return.find(query)
      .populate('products.productId', 'name productCode uom')
      .populate('initiatedBy', 'name')
      .populate('locationId', 'name')
      .populate('targetLocationId', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      data: returns,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Cancel a pending return (By initiator or Admin)
// @route   PUT /api/returns/:id/cancel
const cancelReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const returnRecord = await Return.findById(id);

    if (!returnRecord) return res.status(404).json({ message: 'Return record not found' });
    if (returnRecord.status !== 'pending') return res.status(400).json({ message: 'Only pending returns can be cancelled' });

    // Authorization: Only initiator or Admin
    const isAdmin = (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (returnRecord.initiatedBy.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this return' });
    }

    returnRecord.status = 'cancelled';
    returnRecord.updatedBy = req.user.email;
    await returnRecord.save();

    // Restore stock in source Canteen
    for (const item of returnRecord.products) {
      const fieldToIncrement = (returnRecord.type === 'damage') ? 'damagedQuantity' : 'quantity';
      await Stock.findOneAndUpdate(
        { 
          productId: item.productId, 
          locationId: returnRecord.locationId, 
          locationType: returnRecord.locationType,
          sourceLocationId: returnRecord.targetLocationId,
          sourceLocationType: returnRecord.targetLocationType
        },
        { 
          $inc: { [fieldToIncrement]: item.quantity },
          $set: { status: 'onstock', categoryId: item.categoryId }
        },
        { upsert: true }
      );

      // Record Transaction: Restoration (Outbound return was voluntarily cancelled)
      await Transaction.create({
        transactionType: 'Adjustment',
        productId: item.productId,
        categoryId: item.categoryId,
        quantity: item.quantity,
        fromLocation: { id: returnRecord.targetLocationId, type: returnRecord.targetLocationType },
        toLocation: { id: returnRecord.locationId, type: returnRecord.locationType },
        performedBy: req.user._id,
        referenceId: returnRecord._id,
        remark: `Return CANCELLED by initiator. Stock restored to Canteen ${fieldToIncrement} bucket.`
      });
    }

    res.json({ message: 'Return cancelled successfully', returnRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  initiateReturn,
  updateReturnStatus,
  getReturns,
  cancelReturn
};
