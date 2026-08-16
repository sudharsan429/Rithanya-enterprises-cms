const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { getAuditReport } = require('./controllers/reportController');
const User = require('./models/User');
const Canteen = require('./models/Canteen');

async function testAuditReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ role: 'admin' }) || await User.findOne();
    const canteen = await Canteen.findOne({ name: 'Unit 2' }) || await Canteen.findOne();
    
    if (!user || !canteen) {
      console.error('User or canteen missing');
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const req = {
      query: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        canteenId: canteen._id.toString()
      },
      user: user
    };

    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };

    await getAuditReport(req, res);

    console.log(`Audit Report Data for ${canteen.name} (Items: ${res.data?.length || 0}):`);
    console.log(JSON.stringify(res.data || [], null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testAuditReport();
