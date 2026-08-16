const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Canteen = require('../models/Canteen');
const Transaction = require('../models/Transaction');
const DailyStock = require('../models/DailyStock');
const Product = require('../models/Product');

// @desc    Create a new sale (Billing)
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  try {
    const { canteenId, items, totalAmount, paymentMode, paymentDetails } = req.body;

    // Generate current sale time in HH:mm format
    const now = new Date();
    const saleTime = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    if (!canteenId || !items || !items.length || !totalAmount || !paymentMode) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Sanitize items: Ensure dailyStockId is a valid ObjectId or null
    // AND ensure categoryId is present (fallback to product model if missing)
    const sanitizedItems = await Promise.all(items.map(async item => {
      let dailyStockId = item.dailyStockId;
      if (!dailyStockId || dailyStockId === "" || !mongoose.Types.ObjectId.isValid(dailyStockId)) {
        dailyStockId = null;
      }
      
      let categoryId = item.categoryId;
      if (!categoryId || categoryId === "") {
        const prod = await Product.findById(item.productId);
        if (prod) categoryId = prod.category;
      }
      
      return { ...item, dailyStockId, categoryId };
    }));

    // 1. Fetch Canteen for Bill Number generation
    const canteen = await Canteen.findById(canteenId);
    if (!canteen) {
      return res.status(404).json({ message: 'Canteen not found' });
    }

    // 2. Generate Daily Resetting Bill Number (3 AM Reset)
    const startTime = new Date(now);
    // If it's before 3 AM, the "billing day" started yesterday at 3 AM
    if (now.getHours() < 3) {
      startTime.setDate(startTime.getDate() - 1);
    }
    startTime.setHours(3, 0, 0, 0);

    const sameDaySalesCount = await Sale.countDocuments({
      canteenId,
      createdAt: { $gte: startTime }
    });

    const sequence = String(sameDaySalesCount + 1).padStart(3, '0');
    const sanitizedCanteenName = canteen.name.toUpperCase().replace(/\s+/g, '_');
    
    // Include date prefix (YYMMDD) to ensure billNo is unique across days
    const datePrefix = now.toISOString().slice(2, 10).replace(/-/g, '');
    const billNo = `RE-${sanitizedCanteenName}-${datePrefix}-${sequence}`;

    // 3. Create Sale record
    const sale = await Sale.create({
      canteenId,
      billNo,
      saleTime,
      items: sanitizedItems.map(item => ({
        productId: item.productId,
        categoryId: item.categoryId,
        dailyStockId: item.dailyStockId,
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        uom: item.uom,
        subtotal: item.subtotal
      })),
      totalAmount,
      paymentMode,
      paymentDetails,
      soldBy: req.user._id,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });

    // 4. Reduce Stock in Canteen & Update Originating DailyStock
    for (const item of sanitizedItems) {
      // 4a. Update Real-time Stock (Location-aware tracking)
      // Since Canteens are not batch-aware (unique index is product+location), 
      // we remove dailyStockId from the query to ensure we match the consolidated record.
      const stockQuery = { 
        productId: item.productId, 
        locationId: canteenId, 
        locationType: 'Canteen'
      };

      await Stock.findOneAndUpdate(
        stockQuery,
        { 
          $inc: { 
            quantity: -item.quantity,
            soldQty: item.quantity 
          } 
        }
      );

      // 4b. Update Originating DailyStock batch record (Traceability)
      if (item.dailyStockId) {
        const dStock = await DailyStock.findById(item.dailyStockId);
        if (dStock) {
          const prodIdx = dStock.products.findIndex(p => p.productId.toString() === item.productId.toString());
          if (prodIdx !== -1) {
            // Track sales without losing production count
            dStock.products[prodIdx].soldQty = (dStock.products[prodIdx].soldQty || 0) + item.quantity;
            
            // Keep totals reflecting production
            dStock.totalStock = dStock.products.reduce((acc, p) => acc + (p.quantity || 0), 0);
            dStock.totalRevenue = dStock.products.reduce((acc, p) => acc + ((p.quantity || 0) * (p.costPrice || 0)), 0);
            
            await dStock.save();
          }
        }
      }

      // 4c. Record Transaction Ledger
      await Transaction.create({
        transactionType: 'Sale',
        productId: item.productId,
        categoryId: item.categoryId,
        dailyStockId: item.dailyStockId,
        quantity: item.quantity,
        fromLocation: { id: canteenId, type: 'Canteen' },
        performedBy: req.user._id,
        referenceId: sale._id,
        remark: `Sale @ Bill No: ${billNo}`
      });
    }

    // 5. Emit Socket event
    const io = req.app.get('socketio');
    io.emit('SALE_CREATED', { canteenId, totalAmount, sale });

    // Populate references for the response (useful for receipt)
    const populatedSale = await Sale.findById(sale._id)
      .populate('canteenId', 'name location')
      .populate('items.productId', 'name productCode uom')
      .populate('soldBy', 'name');

    res.status(201).json(populatedSale);
  } catch (error) {
    console.error('CreateSale Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get sales history
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const { canteenId, startDate, endDate } = req.query;
    const query = {};
    
    if (canteenId) query.canteenId = canteenId;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query)
      .populate('canteenId', 'name')
      .populate('items.productId', 'name productCode uom')
      .populate('soldBy', 'name')
      .sort('-createdAt');

    res.json(sales);
  } catch (error) {
    console.error('getSales Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  createSale,
  getSales
};
