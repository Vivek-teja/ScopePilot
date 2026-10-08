const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

const connectDB = async (uri = env.MONGODB_URI) => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    if (env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      if (env.NODE_ENV !== 'test') {
        console.warn('⚠️ MongoDB disconnected.');
      }
    });

    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
