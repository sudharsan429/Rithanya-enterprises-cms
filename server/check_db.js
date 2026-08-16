const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Stock = require('./models/Stock');

async function checkStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const stocks = await Stock.find({ locationType: 'Canteen' }).limit(10);
    console.log('Sample Canteen Stocks:');
    stocks.forEach((s, idx) => {
      console.log(`${idx+1}. Product: ${s.productId}, CatId: ${s.categoryId}, DailyStockId: ${s.dailyStockId}, Qty: ${s.quantity}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkStock();
