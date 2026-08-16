const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing users (optional, use with caution)
    // await User.deleteMany({});

    // Create Superadmin
    const superadminExists = await User.findOne({ role: 'superadmin' , email: 'admin@rithanya.com'});
    if (!superadminExists) {
      await User.create({
        name: 'System Superadmin',
        email: 'admin@rithanya.com',
        password: '123456', // In real system, this should be changed immediately
        role: 'superadmin'
      });
      console.log('Superadmin created: admin@rithanya.com / 123456');
    } else {
      console.log('Superadmin already exists.');
    }

    // Create First Admin
    const adminExists = await User.findOne({ role: 'admin', email: 'admin1@rithanya.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin1@rithanya.com',
        password: '123456',
        role: 'admin'
      });
      console.log('First Admin created: admin1@rithanya.com / 123456');
    } else {
      console.log('First Admin already exists.');
    }

      // Create First sales person
    const salespersonExists = await User.findOne({ role: 'salesperson', email: 'salesperson1@rithanya.com' });
    if (!salespersonExists) {
      await User.create({
        name: 'Salesperson',
        email: 'salesperson@rithanya.com',
        password: '123456',
        role: 'salesperson'
      });
      console.log('First salesperson created: salesperson@rithanya.com / 123456');
    } else {
      console.log('First salesperson already exists.');
    }

    console.log('Seeding completed successfully!');
    process.exit();
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();
