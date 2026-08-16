const Sale = require('../models/Sale');
const Transfer = require('../models/Transfer');
const Return = require('../models/Return');
const Product = require('../models/Product');
const Canteen = require('../models/Canteen');
const ProductionUnit = require('../models/ProductionUnit');
const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

/**
 * REPORT SERVICE HANDLERS (Restored)
 */

exports.getSaleReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId, productId, subTab } = req.query;
    
    const query = {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (req.user?.role === 'prod_manager') {
       return res.status(403).json({ message: 'Production Managers are not authorized to view sales reports' });
    }

    if (req.user?.role === 'salesperson') {
       query.canteenId = new mongoose.Types.ObjectId(req.user.assignedCanteen);
    } else if (canteenId && canteenId !== 'all') {
       query.canteenId = new mongoose.Types.ObjectId(canteenId);
    }

    if (productId && productId !== 'all') {
      query['items.productId'] = new mongoose.Types.ObjectId(productId);
    }

    // 1. Calculate Aggregated Sales Data (Grouped by Canteen -> Category -> Product)
    const pipeline = [
      { $match: query },
      { $unwind: '$items' }
    ];

    // Post-unwind filter if product is selected
    if (productId && productId !== 'all') {
      pipeline.push({ $match: { 'items.productId': new mongoose.Types.ObjectId(productId) } });
    }

    if (subTab === 'category_wise') {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'pData' } },
         { $lookup: { from: 'categories', localField: 'items.categoryId', foreignField: '_id', as: 'catData' } },
         { $unwind: { path: '$pData', preserveNullAndEmptyArrays: true } }, 
         { $unwind: { path: '$catData', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { catId: '$items.categoryId', prodId: '$items.productId', priceAtSale: '$items.priceAtSale' },
              catName: { $first: '$catData.name' },
              prodName: { $first: '$pData.name' },
              qty: { $sum: '$items.quantity' },
              total: { $sum: '$items.subtotal' },
              unitPrice: { $first: '$items.priceAtSale' }
            }
          },
          {
            $group: {
              _id: '$_id.catId',
              groupName: { $first: '$catName' },
              salelist: [{
                category: 'PRODUCT LIST',
                productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total', unitPrice: '$unitPrice' } }
              }]
            }
          }
       );
    } else {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'pData' } },
         { $lookup: { from: 'categories', localField: 'items.categoryId', foreignField: '_id', as: 'catData' } },
         { $lookup: { from: 'canteens', localField: 'canteenId', foreignField: '_id', as: 'cantData' } },
         { $unwind: { path: '$pData', preserveNullAndEmptyArrays: true } }, 
         { $unwind: { path: '$catData', preserveNullAndEmptyArrays: true } }, 
         { $unwind: { path: '$cantData', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { canteenId: '$canteenId', catId: '$items.categoryId', prodId: '$items.productId', priceAtSale: '$items.priceAtSale' },
              canteenName: { $first: '$cantData.name' },
              catName: { $first: '$catData.name' },
              prodName: { $first: '$pData.name' },
              qty: { $sum: '$items.quantity' },
              total: { $sum: '$items.subtotal' },
              unitPrice: { $first: '$items.priceAtSale' }
            }
          },
          {
            $group: {
              _id: { canteenId: '$_id.canteenId', catId: '$_id.catId' },
              canteenName: { $first: '$canteenName' },
              catName: { $first: '$catName' },
              productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total', unitPrice: '$unitPrice' } }
            }
          },
         {
           $group: {
             _id: '$_id.canteenId',
             groupName: { $first: '$canteenName' },
             salelist: { $push: { category: '$catName', productlist: '$productlist' } }
           }
         }
       );
    }

    const salesAggregation = await Sale.aggregate(pipeline);

    // 2. Calculate Payment Summaries per Entity
    const paymentSummaries = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$canteenId',
          cashTotal: { $sum: '$paymentDetails.cashAmount' },
          upiTotal: { $sum: '$paymentDetails.upiAmount' }
        }
      }
    ]);

    res.json(salesAggregation.map(row => {
      const summary = paymentSummaries.find(p => p._id?.toString() === row._id?.toString());
      return {
        canteenname: row.groupName,
        salelist: row.salelist,
        paymentdetails: [
          { mode: 'CASH', total: summary?.cashTotal || 0 },
          { mode: 'UPI', total: summary?.upiTotal || 0 }
        ]
      };
    }));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// MONTHLY REPORT: DAILY AGGREGATION
// ==========================================
exports.getMonthlySaleReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId } = req.query;

    if (req.user?.role === 'prod_manager') {
       return res.status(403).json({ message: 'Production Managers are not authorized to view sales reports' });
    }

    const query = {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (req.user?.role === 'salesperson') {
       query.canteenId = new mongoose.Types.ObjectId(req.user.assignedCanteen);
    } else if (canteenId && canteenId !== 'all') {
       query.canteenId = new mongoose.Types.ObjectId(canteenId);
    }

    const aggregation = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            canteenId: '$canteenId',
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+05:30" } }
          },
          totalRevenue: { $sum: '$totalAmount' },
          cash: { $sum: '$paymentDetails.cashAmount' },
          upi: { $sum: '$paymentDetails.upiAmount' }
        }
      },
      { $sort: { '_id.date': 1 } },
      { $lookup: { from: 'canteens', localField: '_id.canteenId', foreignField: '_id', as: 'cantData' } },
      { $unwind: { path: '$cantData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id.canteenId',
          canteenname: { $first: '$cantData.name' },
          productlist: {
            $push: { productName: '$_id.date', total: '$totalRevenue' }
          },
          totalCash: { $sum: '$cash' },
          totalUpi: { $sum: '$upi' }
        }
      }
    ]);

    res.json(aggregation.map(c => ({
      canteenname: c.canteenname,
      salelist: [{ category: 'DAILY REVENUE SUMMARY', productlist: c.productlist }],
      paymentdetails: [
        { mode: 'CASH', total: c.totalCash },
        { mode: 'UPI', total: c.totalUpi }
      ]
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTransferReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId, subTab } = req.query;
    const query = {
      status: 'approved',
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    if (req.user?.role === 'salesperson') {
       const userCanteen = new mongoose.Types.ObjectId(req.user.assignedCanteen);
       query.$or = [{ sourceLocationId: userCanteen }, { destinationLocationId: userCanteen }];
    } else if (req.user?.role === 'prod_manager') {
       const userUnit = new mongoose.Types.ObjectId(req.user.assignedProductionUnit);
       query.$or = [{ sourceLocationId: userUnit }, { destinationLocationId: userUnit }];
    } else if (canteenId && canteenId !== 'all') {
       const targetLoc = new mongoose.Types.ObjectId(canteenId);
       query.$or = [{ sourceLocationId: targetLoc }, { destinationLocationId: targetLoc }];
    }

    const isCategoryWise = subTab === 'category_wise';
    const pipeline = [{ $match: query }, { $unwind: '$items' }];

    if (isCategoryWise) {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'p' } },
         { $lookup: { from: 'categories', localField: 'items.categoryId', foreignField: '_id', as: 'c' } },
         { $unwind: '$p' }, { $unwind: '$c' },
         {
           $group: {
             _id: { catId: '$items.categoryId', prodId: '$items.productId' },
             catName: { $first: '$c.name' },
             prodName: { $first: '$p.name' },
             qty: { $sum: '$items.quantity' },
             total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
           }
         },
         {
           $group: {
             _id: '$_id.catId',
             groupName: { $first: '$catName' },
             salelist: [{ category: 'GLOBAL MOVEMENT', productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total' } } }]
           }
         }
       );
    } else {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'p' } },
         { $lookup: { from: 'categories', localField: 'items.categoryId', foreignField: '_id', as: 'c' } },
         { $lookup: { from: 'canteens', localField: 'destinationLocationId', foreignField: '_id', as: 'dest' } },
         { $unwind: '$p' }, { $unwind: '$c' }, { $unwind: '$dest' },
         {
           $group: {
             _id: { destId: '$destinationLocationId', catId: '$items.categoryId', prodId: '$items.productId' },
             destName: { $first: '$dest.name' },
             catName: { $first: '$c.name' },
             prodName: { $first: '$p.name' },
             qty: { $sum: '$items.quantity' },
             total: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
           }
         },
         {
           $group: {
             _id: { destId: '$_id.destId', catId: '$_id.catId' },
             destName: { $first: '$destName' },
             catName: { $first: '$catName' },
             productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total' } }
           }
         },
         {
           $group: {
             _id: '$_id.destId',
             groupName: { $first: '$destName' },
             salelist: { $push: { category: '$catName', productlist: '$productlist' } }
           }
         }
       );
    }

    const aggregation = await Transfer.aggregate(pipeline);
    res.json(aggregation.map(a => ({ canteenname: a.groupName, salelist: a.salelist, paymentdetails: [] })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getReturnReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId, subTab } = req.query;
    const query = {
      status: 'approved',
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (req.user?.role === 'salesperson') {
       query.locationId = new mongoose.Types.ObjectId(req.user.assignedCanteen);
    } else if (req.user?.role === 'prod_manager') {
       query.targetLocationId = new mongoose.Types.ObjectId(req.user.assignedProductionUnit);
    } else if (canteenId && canteenId !== 'all') {
       query.locationId = new mongoose.Types.ObjectId(canteenId);
    }


    const isCategoryWise = subTab === 'category_wise';
    const pipeline = [{ $match: query }, { $unwind: '$products' }];

    if (isCategoryWise) {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'products.productId', foreignField: '_id', as: 'p' } },
         { $lookup: { from: 'categories', localField: 'products.categoryId', foreignField: '_id', as: 'c' } },
         { $unwind: '$p' }, { $unwind: '$c' },
         {
           $group: {
             _id: '$products.productId',
             prodName: { $first: '$p.name' },
             catName: { $first: '$c.name' },
             qty: { $sum: '$products.quantity' },
             total: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
           }
         },
         {
           $group: {
             _id: '$catName',
             groupName: { $first: '$catName' },
             salelist: [{ category: 'GLOBAL RETURNS', productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total' } } }]
           }
         }
       );
    } else {
       pipeline.push(
         { $lookup: { from: 'products', localField: 'products.productId', foreignField: '_id', as: 'p' } },
         { $lookup: { from: 'categories', localField: 'products.categoryId', foreignField: '_id', as: 'c' } },
         { $lookup: { from: 'canteens', localField: 'locationId', foreignField: '_id', as: 'loc' } },
         { $unwind: '$p' }, { $unwind: '$c' }, { $unwind: '$loc' },
         {
           $group: {
             _id: { locId: '$locationId', catId: '$products.categoryId', prodId: '$products.productId' },
             locName: { $first: '$loc.name' },
             catName: { $first: '$c.name' },
             prodName: { $first: '$p.name' },
             qty: { $sum: '$products.quantity' },
             total: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
           }
         },
         {
           $group: {
             _id: { locId: '$_id.locId', catId: '$_id.catId' },
             locName: { $first: '$locName' },
             catName: { $first: '$catName' },
             productlist: { $push: { productName: '$prodName', qty: '$qty', total: '$total' } }
           }
         },
         {
           $group: {
             _id: '$_id.locId',
             groupName: { $first: '$locName' },
             salelist: { $push: { category: '$catName', productlist: '$productlist' } }
           }
         }
       );
    }
    const aggregation = await Return.aggregate(pipeline);
    res.json(aggregation.map(a => ({ canteenname: a.groupName, salelist: a.salelist, paymentdetails: [] })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getDamageReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId, subTab } = req.query;
    // Damage logic is identical to Return logic, but filters for 'damage' types if applicable
    const query = {
      status: 'approved',
      type: 'damage',
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };
    if (req.user?.role === 'salesperson') {
       query.locationId = new mongoose.Types.ObjectId(req.user.assignedCanteen);
    } else if (req.user?.role === 'prod_manager') {
       query.targetLocationId = new mongoose.Types.ObjectId(req.user.assignedProductionUnit);
    } else if (canteenId && canteenId !== 'all') {
       query.locationId = new mongoose.Types.ObjectId(canteenId);
    }


    const isCategoryWise = subTab === 'category_wise';
    const pipeline = [{ $match: query }, { $unwind: '$products' }];

    // (Simplified grouping for damage)
    pipeline.push(
      { $lookup: { from: 'products', localField: 'products.productId', foreignField: '_id', as: 'p' } },
      { $lookup: { from: 'categories', localField: 'products.categoryId', foreignField: '_id', as: 'c' } },
      { $lookup: { from: 'canteens', localField: 'locationId', foreignField: '_id', as: 'loc' } },
      { $unwind: '$p' }, { $unwind: '$c' }, { $unwind: '$loc' },
      {
        $group: {
          _id: { locId: '$locationId', catId: '$products.categoryId' },
          locName: { $first: '$loc.name' },
          catName: { $first: '$c.name' },
          productlist: { $push: { productName: '$p.name', qty: '$products.quantity', total: { $multiply: ['$products.quantity', '$products.price'] } } }
        }
      },
      {
        $group: {
          _id: '$_id.locId',
          groupName: { $first: '$locName' },
          salelist: { $push: { category: '$catName', productlist: '$productlist' } }
        }
      }
    );

    const aggregation = await Return.aggregate(pipeline);
    res.json(aggregation.map(a => ({ canteenname: a.groupName, salelist: a.salelist, paymentdetails: [] })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getStockReport = async (req, res) => {
  try {
    const { canteenId, subTab, startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const query = {};
    const movementQuery = { createdAt: { $gte: start, $lte: end } };

    if (req.user.role === 'salesperson') {
       query.locationId = new mongoose.Types.ObjectId(req.user.assignedCanteen);
       query.locationType = 'Canteen';
    } else if (req.user.role === 'prod_manager') {
       query.locationId = new mongoose.Types.ObjectId(req.user.assignedProductionUnit);
       query.locationType = 'ProductionUnit';
    } else {
       if (subTab === 'production_unit') query.locationType = 'ProductionUnit';
       else if (subTab === 'canteen') query.locationType = 'Canteen';
       if (canteenId && canteenId !== 'all') query.locationId = new mongoose.Types.ObjectId(canteenId);
    }

    const pipeline = [
      { $match: query },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'c' } },
      { $lookup: { from: 'canteens', localField: 'locationId', foreignField: '_id', as: 'cantInfo' } },
      { $lookup: { from: 'productionunits', localField: 'locationId', foreignField: '_id', as: 'puInfo' } },
      { $unwind: '$p' }, { $unwind: '$c' },
      
      // 1. Calculate Received Quantity (Inbound Transfers) in Range
      {
        $lookup: {
          from: 'transfers',
          let: { pId: '$productId', lId: '$locationId' },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$toLocation.id', '$$lId'] },
                  { $eq: ['$overallStatus', 'completed'] },
                  { $gte: ['$createdAt', start] },
                  { $lte: ['$createdAt', end] }
                ]
              } 
            } },
            { $unwind: '$products' },
            { $match: { $expr: { $eq: ['$products.productId', '$$pId'] } } },
            { $group: { _id: null, total: { $sum: '$products.acceptedQuantity' } } }
          ],
          as: 'receivedData'
        }
      },
      // 2. Calculate Sold Quantity (Sales) in Range
      {
        $lookup: {
          from: 'sales',
          let: { pId: '$productId', lId: '$locationId' },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$canteenId', '$$lId'] },
                  { $gte: ['$createdAt', start] },
                  { $lte: ['$createdAt', end] }
                ]
              } 
            } },
            { $unwind: '$items' },
            { $match: { $expr: { $eq: ['$items.productId', '$$pId'] } } },
            { $group: { _id: null, total: { $sum: '$items.quantity' } } }
          ],
          as: 'soldData'
        }
      },
      // 3. Calculate Transferred Quantity (Outbound Transfers) in Range
      {
        $lookup: {
          from: 'transfers',
          let: { pId: '$productId', lId: '$locationId' },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$fromLocation.id', '$$lId'] },
                  { $in: ['$overallStatus', ['in_transit', 'completed']] },
                  { $gte: ['$createdAt', start] },
                  { $lte: ['$createdAt', end] }
                ]
              } 
            } },
            { $unwind: '$products' },
            { $match: { $expr: { $eq: ['$products.productId', '$$pId'] } } },
            { $group: { _id: null, total: { $sum: '$products.quantity' } } }
          ],
          as: 'outboundData'
        }
      },
      // 4. Calculate Produced Quantity (Transactions - Adjustment) in Range
      {
        $lookup: {
          from: 'transactions',
          let: { pId: '$productId', lId: '$locationId' },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$fromLocation.id', '$$lId'] },
                  { $eq: ['$transactionType', 'Adjustment'] },
                  { $gte: ['$createdAt', start] },
                  { $lte: ['$createdAt', end] }
                ]
              } 
            } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
          ],
          as: 'producedData'
        }
      },
      {
        $addFields: {
          receivedQty: { $ifNull: [{ $arrayElemAt: ['$receivedData.total', 0] }, 0] },
          soldQtyInRange: { $ifNull: [{ $arrayElemAt: ['$soldData.total', 0] }, 0] },
          outboundQty: { $ifNull: [{ $arrayElemAt: ['$outboundData.total', 0] }, 0] },
          producedQty: { $ifNull: [{ $arrayElemAt: ['$producedData.total', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: { locId: '$locationId', catId: '$categoryId' },
          locName: { $first: { $ifNull: [{ $arrayElemAt: ['$cantInfo.name', 0] }, { $arrayElemAt: ['$puInfo.name', 0] }, 'Unknown'] } },
          catName: { $first: '$c.name' },
          productlist: {
            $push: {
              productName: '$p.name',
              qty: { $ifNull: ['$quantity', 0] },
              opening: { $ifNull: ['$openingBalance', 0] },
              transfer: '$outboundQty',
              sold: '$soldQtyInRange',
              received: '$receivedQty',
              produced: '$producedQty',
              price: { $ifNull: ['$price', 0] },
              total: { $multiply: [{ $ifNull: ['$quantity', 0] }, { $ifNull: ['$price', 0] }] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.locId',
          canteenname: { $first: '$locName' },
          salelist: { $push: { category: '$catName', productlist: '$productlist' } }
        }
      }
    ];

    const aggregation = await Stock.aggregate(pipeline);
    res.json(aggregation.map(a => ({ ...a, paymentdetails: [] })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getAuditReport = async (req, res) => {
  try {
    const { startDate, endDate, canteenId } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const query = { createdAt: { $gte: start, $lte: end } };
    
    if (req.query.type) {
       query.transactionType = req.query.type;
    }

    if (req.user.role === 'salesperson') {
       const userCanteen = new mongoose.Types.ObjectId(req.user.assignedCanteen);
       query.$or = [{ 'fromLocation.id': userCanteen }, { 'toLocation.id': userCanteen }];
    } else if (req.user.role === 'prod_manager') {
       const userUnit = new mongoose.Types.ObjectId(req.user.assignedProductionUnit);
       query.$or = [{ 'fromLocation.id': userUnit }, { 'toLocation.id': userUnit }];
    } else if (canteenId && canteenId !== 'all') {
       const targetLoc = new mongoose.Types.ObjectId(canteenId);
       query.$or = [{ 'fromLocation.id': targetLoc }, { 'toLocation.id': targetLoc }];
    }

    const audit = await Transaction.aggregate([
      { $match: query },
      { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      // Lookup From Location Name
      { $lookup: { from: 'canteens', localField: 'fromLocation.id', foreignField: '_id', as: 'fromCanteen' } },
      { $lookup: { from: 'productionunits', localField: 'fromLocation.id', foreignField: '_id', as: 'fromPU' } },
      // Lookup To Location Name
      { $lookup: { from: 'canteens', localField: 'toLocation.id', foreignField: '_id', as: 'toCanteen' } },
      { $lookup: { from: 'productionunits', localField: 'toLocation.id', foreignField: '_id', as: 'toPU' } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          date: '$createdAt',
          type: '$transactionType',
          productName: '$p.name',
          qty: '$quantity',
          from: { $ifNull: [{ $arrayElemAt: ['$fromCanteen.name', 0] }, { $arrayElemAt: ['$fromPU.name', 0] }, 'System'] },
          to: { $ifNull: [{ $arrayElemAt: ['$toCanteen.name', 0] }, { $arrayElemAt: ['$toPU.name', 0] }, 'System'] },
          remark: '$remark'
        }
      }
    ]);
    res.json(audit);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getLocations = async (req, res) => {
  try {
    const [canteens, units] = await Promise.all([
      Canteen.find({}).select('name location').lean(),
      ProductionUnit.find({}).select('name location').lean()
    ]);

    const formattedCanteens = canteens.map(c => ({ ...c, type: 'Canteen' }));
    const formattedUnits = units.map(u => ({ ...u, type: 'ProductionUnit' }));

    res.json([...formattedCanteens, ...formattedUnits]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
