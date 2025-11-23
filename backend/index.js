require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');

    // Get local IP address
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';

    // Find the first non-internal IPv4 address
    for (const interfaceName of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[interfaceName]) {
        if (net.family === 'IPv4' && !net.internal) {
          localIP = net.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API Local: http://localhost:${PORT}/api`);
      console.log(`📍 API Network: http://${localIP}:${PORT}/api`);
      console.log(`\n📱 Để điện thoại kết nối, sử dụng: http://${localIP}:${PORT}/api`);
    });
  })
  .catch(error => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });
