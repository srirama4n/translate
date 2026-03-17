/**
 * MongoDB Connection Configuration
 *
 * Set MONGODB_URI in environment or .env:
 * MONGODB_URI=mongodb://localhost:27017/translate
 * For Atlas: mongodb+srv://user:pass@cluster.mongodb.net/translate
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/translate';
    const opts = {
      maxPoolSize: 10,
    };
    await mongoose.connect(uri, opts);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
