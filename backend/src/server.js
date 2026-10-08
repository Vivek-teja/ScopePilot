const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`🚀 ScopePilot Backend running on http://localhost:${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🏥 Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

// Start the application
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, startServer };
