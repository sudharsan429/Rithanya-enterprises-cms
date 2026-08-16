const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Transaction = require('./models/Transaction');

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all transactions
    const txs = await Transaction.find().sort({ createdAt: -1 }).limit(20);
    console.log('Recent 20 Transactions:');
    txs.forEach((t, idx) => {
      console.log(`${idx+1}. Type: ${t.transactionType}, Product: ${t.productId}, Qty: ${t.quantity}, Reference: ${t.referenceId}, CreatedAt: ${t.createdAt}`);
    });
    
    // Check for transactions with missing fields
    const malformed = await Transaction.find({
      $or: [
        { productId: { $exists: false } },
        { transactionType: { $exists: false } },
        { quantity: { $exists: false } }
      ]
    });
    console.log(`Found ${malformed.length} malformed transactions`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkTransactions();
