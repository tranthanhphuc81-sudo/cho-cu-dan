const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/database');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@local.test';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      console.log(`Admin already exists: ${adminEmail}`);
      process.exit(0);
    }

    admin = await User.create({
      name: 'Administrator',
      email: adminEmail,
      password: adminPass,
      phone: '0000000000',
      address: { building: 'Admin HQ', city: 'Local' },
      role: 'admin',
      isVerified: true
    });

    console.log('Admin user created successfully:');
    console.log('  email:', adminEmail);
    console.log('  password:', adminPass);
    process.exit(0);
  } catch (err) {
    console.error('Seed admin error:', err);
    process.exit(1);
  }
};

seedAdmin();
