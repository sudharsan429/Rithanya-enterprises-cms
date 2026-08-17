const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.set('socketio', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/canteens', require('./routes/canteenRoutes'));
app.use('/api/production-units', require('./routes/productionUnitRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/returns', require('./routes/returnRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Database Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && !mongoUri.includes('<db_password>')) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB successfully!');
      const User = require('./models/User');

if (!(await User.findOne({ email: 'admin@rithanya.com' }))) {
  await User.create({
    name: 'System Superadmin',
    email: 'admin@rithanya.com',
    password: '123456',
    role: 'superadmin'
  });

  console.log('Default superadmin created!');
}
    } else {
      console.log('Starting temporary In-Memory MongoDB...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('Connected to In-Memory MongoDB successfully!');
      
      // Auto-seed for convenience
      const User = require('./models/User');
      if (!(await User.findOne({ email: 'admin1@rithanya.com' }))) {
        await User.create({ name: 'Admin', email: 'admin1@rithanya.com', password: '123456', role: 'admin' });
        await User.create({ name: 'System Superadmin', email: 'admin@rithanya.com', password: '123456', role: 'superadmin' });
        await User.create({ name: 'Salesperson', email: 'salesperson@rithanya.com', password: '123456', role: 'salesperson' });
        console.log('In-Memory DB Seeded with default users!');
      }
    }
  } catch (err) {
    console.error('Failed to start DB:', err);
  }
};
connectDB();

// Socket.io setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('RITHANYA ENTERPRISES CMS API is running...');
});

const PORT = process.env.PORT || 5000;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing process or change PORT in server/.env.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Trigger restart
