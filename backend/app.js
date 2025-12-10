const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Allow requests with no origin (like mobile apps or curl requests) - only in development
    if (!origin && !isProduction) {
      return callback(null, true);
    }

    // In production, require origin
    if (isProduction && !origin) {
      return callback(new Error('CORS: Origin is required in production'));
    }

    // Build allowed origins list
    const allowedOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL].filter(Boolean); // Remove undefined values

    // In development, allow localhost and ngrok
    if (!isProduction) {
      const localhostOrigins = [
        'http://localhost:3000',
        'http://localhost:5173', // Vite default port
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ];
      allowedOrigins.push(...localhostOrigins);

      // Allow ngrok domains (both old and new ngrok domains)
      const isNgrok =
        /^https?:\/\/.*\.(ngrok\.io|ngrok-free\.app|ngrok\.app|ngrok-free\.dev)(:\d+)?$/.test(
          origin
        );

      // Allow localhost
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowedOrigins.includes(origin) || isNgrok || isLocalhost) {
        return callback(null, true);
      }
    }

    // In production, only allow explicitly configured origins
    if (isProduction) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`CORS blocked origin in production: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      }
    }

    // Fallback for development
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API Server is running' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/student', require('./routes/student'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/teachers', require('./routes/teacher'));
app.use('/api/admin/students', require('./routes/adminstudent')); // admin manager

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

module.exports = app;
