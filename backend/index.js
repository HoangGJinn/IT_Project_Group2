require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API Local: http://localhost:${PORT}/api`);
      console.log(`\n💡 Tip: Sử dụng ngrok để truy cập từ điện thoại (xem NGROK_SETUP.md)`);
    });
  })
  .catch(error => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });
