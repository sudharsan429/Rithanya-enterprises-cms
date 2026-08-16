const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'server/.env' });

const Stock = require('./server/models/Stock');

async function checkStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const stocks = await Stock.find({ locationType: 'Canteen' }).limit(5);
    console.log('Sample Canteen Stocks:');
    stocks.forEach(s => {
      console.log(`Product: ${s.productId}, DailyStockId: ${s.dailyStockId}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkStock();
