const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Transaction = require('./models/Transaction');

async function debugTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find absolute latest 10 transactions of ANY type
    const txs = await Transaction.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('--- LATEST 10 TRANSACTIONS ---');
    txs.forEach((t, i) => {
      console.log(`[${i+1}] ID: ${t._id}`);
      console.log(`     Type: ${t.transactionType}`);
      console.log(`     Product: ${t.productId}`);
      console.log(`     Qty: ${t.quantity}`);
      console.log(`     From: ${JSON.stringify(t.fromLocation)}`);
      console.log(`     To: ${JSON.stringify(t.toLocation)}`);
      console.log(`     Date: ${t.createdAt}`);
      console.log('---------------------------');
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

debugTransactions();
