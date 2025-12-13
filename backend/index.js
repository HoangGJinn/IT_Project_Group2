require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { autoFinishSessions } = require('./utils/sessionAutoFinish');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables in production
if (NODE_ENV === 'production') {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please set all required environment variables before starting the server.');
    process.exit(1);
  }

  // Validate JWT_SECRET is not default value
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.error('❌ JWT_SECRET must be changed from default value in production!');
    process.exit(1);
  }
}

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('✅ Database connection established successfully.');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server is running on port ${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`📍 Environment: ${NODE_ENV}`);
      if (NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`📍 API Local: http://localhost:${PORT}/api`);
        // eslint-disable-next-line no-console
        console.log(`\n💡 Tip: Sử dụng ngrok để truy cập từ điện thoại (xem NGROK_SETUP.md)`);
      }

      // Setup cron job để tự động xử lý các session đã kết thúc
      // Chạy mỗi 5 phút
      setInterval(
        async () => {
          try {
            await autoFinishSessions();
          } catch (error) {
            console.error('Error in auto finish sessions cron job:', error);
          }
        },
        5 * 60 * 1000
      ); // 5 minutes

      // Chạy ngay lập tức khi server khởi động
      autoFinishSessions().catch(error => {
        console.error('Error in initial auto finish sessions:', error);
      });
    });
  })
  .catch(error => {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  });
