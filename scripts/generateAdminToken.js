const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectDB = require('../config/database');

dotenv.config();

const generate = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || 'admin@local.test';
    const user = await User.findOne({ email });

    if (!user) {
      console.error('Admin user not found. Please run `npm run seed:admin` first or set ADMIN_EMAIL in .env');
      process.exit(1);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-super-secret-jwt-key', {
      expiresIn: '30d'
    });

    console.log('Admin user email:', user.email);
    console.log('Generated JWT token (Bearer):');
    console.log(token);
    process.exit(0);
  } catch (err) {
    console.error('Error generating admin token:', err);
    process.exit(1);
  }
};

generate();
