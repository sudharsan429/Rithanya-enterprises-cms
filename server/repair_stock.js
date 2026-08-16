const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Stock = require('./models/Stock');
const Product = require('./models/Product');

async function repairStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find stocks with missing categoryId
    const stocks = await Stock.find({ categoryId: { $exists: false } });
    console.log(`Found ${stocks.length} stock records with missing categoryId`);
    
    for (const s of stocks) {
      const product = await Product.findById(s.productId);
      if (product && product.category) {
        s.categoryId = product.category;
        await s.save();
        console.log(`Fixed stock record for product: ${product.name}`);
      } else {
        console.warn(`Could not fix stock record for product ID: ${s.productId} (Product or category not found)`);
      }
    }
    
    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
}

repairStock();
