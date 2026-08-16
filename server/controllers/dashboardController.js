const Sale = require('../models/Sale');
const Stock = require('../models/Stock');
const Canteen = require('../models/Canteen');
const ProductionUnit = require('../models/ProductionUnit');
const Transfer = require('../models/Transfer');
const DailyStock = require('../models/DailyStock');
const mongoose = require('mongoose');

// Helper to get operational day range (Starts at 3 AM)
const getOperationalDayRange = () => {
  const now = new Date();
  const start = new Date(now);
  if (now.getHours() < 3) {
    start.setDate(now.getDate() - 1);
  }
  start.setHours(3, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setMilliseconds(-1);
  
  return { start, end };
};

const getStats = async (req, res) => {
  try {
    const { role, assignedCanteen, assignedProductionUnit } = req.user;
    const { start: opStart, end: opEnd } = getOperationalDayRange();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let stats = {
      todaySale: 0,
      todayRevenue: 0,
      todayStock: 0,
      overallSale: 0,
      overallRevenue: 0,
      overallStock: 0,
      charts: {}
    };

    // 1. ADMIN - GLOBAL STATS
    if (role === 'superadmin' || role === 'admin') {
      const [todayS, overallS, stockS] = await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Sale.aggregate([
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Stock.aggregate([
          { $group: { _id: null, totalQty: { $sum: '$quantity' }, totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } } } }
        ])
      ]);

      // Charts
      const [canteenTodayStats, last30DaysTrend, puStockHistory] = await Promise.all([
        Sale.aggregate([
          { $match: { createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: '$canteenId', revenue: { $sum: '$totalAmount' }, sales: { $sum: 1 } } },
          { $lookup: { from: 'canteens', localField: '_id', foreignField: '_id', as: 'canteen' } },
          { $unwind: '$canteen' },
          { $project: { name: '$canteen.name', revenue: 1, sales: 1 } }
        ]),
        Sale.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { 
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
              revenue: { $sum: "$totalAmount" },
              sales: { $sum: 1 }
            } 
          },
          { $sort: { _id: 1 } }
        ]),
        DailyStock.aggregate([
          { $match: { date: { $gte: thirtyDaysAgo } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, totalStock: { $sum: "$totalStock" } } },
          { $sort: { _id: 1 } }
        ])
      ]);

      const stockByCanteen = await Stock.aggregate([
        { $match: { locationType: 'Canteen' } },
        { $group: { _id: '$locationId', total: { $sum: '$quantity' } } },
        { $lookup: { from: 'canteens', localField: '_id', foreignField: '_id', as: 'canteen' } },
        { $unwind: '$canteen' },
        { $project: { name: '$canteen.name', total: 1 } }
      ]);

      stats = {
        ...stats,
        todaySale: todayS[0]?.count || 0,
        todayRevenue: todayS[0]?.total || 0,
        todayStock: stockS[0]?.totalQty || 0,
        overallSale: overallS[0]?.count || 0,
        overallRevenue: overallS[0]?.total || 0,
        overallStock: stockS[0]?.totalQty || 0,
        charts: {
            canteenTodayStats,
            last30DaysTrend,
            puStockHistory,
            stockByCanteen
        }
      };

    } 
    // 2. PRODUCTION MANAGER
    else if (role === 'prod_manager') {
      const puId = new mongoose.Types.ObjectId(assignedProductionUnit);

      const [puTransfersToday, puTransfersOverall, puStock] = await Promise.all([
        Transfer.aggregate([
          { $match: { "fromLocation.id": puId, overallStatus: 'completed', createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]),
        Transfer.aggregate([
          { $match: { "fromLocation.id": puId, overallStatus: 'completed' } },
          { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
        ]),
        Stock.aggregate([
          { $match: { locationId: puId } },
          { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
        ])
      ]);

      const [todayTrend, transferTrend] = await Promise.all([
        Transfer.aggregate([
          { $match: { "fromLocation.id": puId, overallStatus: 'completed', createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: { $hour: "$createdAt" }, sales: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
          { $sort: { _id: 1 } }
        ]),
        Transfer.aggregate([
          { $match: { "fromLocation.id": puId, overallStatus: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { 
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
              sales: { $sum: 1 }, 
              revenue: { $sum: "$totalAmount" } 
            } 
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      // Stock by Category for Today
      const stockLevels = await Stock.aggregate([
        { $match: { locationId: puId } },
        { $group: { _id: '$productId', total: { $sum: '$quantity' } } },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
        { $unwind: '$prod' },
        { $project: { name: '$prod.name', total: 1 } }
      ]);

      stats = {
        ...stats,
        todaySale: puTransfersToday[0]?.count || 0,
        todayRevenue: puTransfersToday[0]?.total || 0,
        todayStock: puStock[0]?.totalQty || 0,
        overallSale: puTransfersOverall[0]?.count || 0,
        overallRevenue: puTransfersOverall[0]?.total || 0,
        overallStock: puStock[0]?.totalQty || 0,
        charts: { todayTrend, transferTrend, stockLevels }
      };

    } 
    // 3. SALESPERSON
    else if (role === 'salesperson') {
      const canteenId = new mongoose.Types.ObjectId(assignedCanteen);

      const [todaySales, canteenStock] = await Promise.all([
        Sale.aggregate([
          { $match: { canteenId: canteenId, createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]),
        Stock.aggregate([
          { $match: { locationId: canteenId } },
          { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
        ])
      ]);

      const [todayTrend, stockLevels, last30DaysTrend] = await Promise.all([
        Sale.aggregate([
          { $match: { canteenId: canteenId, createdAt: { $gte: opStart, $lte: opEnd } } },
          { $group: { _id: { $hour: "$createdAt" }, revenue: { $sum: "$totalAmount" }, sales: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Stock.aggregate([
          { $match: { locationId: canteenId } },
          { $group: { _id: '$productId', total: { $sum: '$quantity' } } },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'prod' } },
          { $unwind: '$prod' },
          { $project: { name: '$prod.name', total: 1 } }
        ]),
        Sale.aggregate([
          { $match: { canteenId: canteenId, createdAt: { $gte: thirtyDaysAgo } } },
          { $group: { 
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
              revenue: { $sum: "$totalAmount" },
              sales: { $sum: 1 }
            } 
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      stats = {
        ...stats,
        todaySale: todaySales[0]?.count || 0,
        todayRevenue: todaySales[0]?.total || 0,
        todayStock: canteenStock[0]?.totalQty || 0,
        charts: { todayTrend, stockLevels, last30DaysTrend }
      };
    }

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats };
