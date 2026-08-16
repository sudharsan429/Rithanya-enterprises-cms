const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { createSale } = require('./controllers/saleController');
const Canteen = require('./models/Canteen');
const Product = require('./models/Product');
const User = require('./models/User');

async function testFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const canteen = await Canteen.findOne({ name: 'Unit 2' }) || await Canteen.findOne();
    const product = await Product.findOne();
    const user = await User.findOne();
    
    if (!canteen || !product || !user) {
      console.error('Test data missing');
      return;
    }

    const req = {
      body: {
        canteenId: canteen._id,
        items: [{
          productId: product._id,
          dailyStockId: "", 
          quantity: 1,
          priceAtSale: 20,
          uom: product.uom,
          subtotal: 20
        }],
        totalAmount: 20,
        paymentMode: 'cash',
        paymentDetails: { cashAmount: 20, cashReceived: 20, changeAmount: 0 }
      },
      user: { _id: user._id, email: user.email },
      app: { get: () => ({ emit: () => {} }) }
    };

    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };

    await createSale(req, res);

    if (res.statusCode === 201) {
      console.log('✅ Success: Sale created with Bill No:', res.data.billNo);
    } else {
      console.error('❌ Failed: Status', res.statusCode);
      console.error('Error Details:', res.data);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Test crashed:', err);
  }
}

testFix();
