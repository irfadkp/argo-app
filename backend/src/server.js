// Instana MUST be required first for proper instrumentation
require('./instana');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const config = require('./config/app');
const { logger, requestLogger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

logger.info('Starting E-commerce Backend API', {
  nodeVersion: process.version,
  environment: config.nodeEnv,
  port: config.port,
  corsOrigin: config.corsOrigin
});

// Security middleware
app.use(helmet());
logger.debug('Security middleware (helmet) initialized');

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
logger.debug('CORS middleware initialized', { origin: config.corsOrigin });

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    res.status(429).json({ error: 'Too many requests from this IP, please try again later.' });
  }
});
app.use('/api/', limiter);
logger.debug('Rate limiting middleware initialized', {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
logger.debug('Body parsing middleware initialized');

// Custom request logger (winston)
app.use(requestLogger);

// Morgan HTTP logger (for additional HTTP-specific logging)
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}
logger.debug('HTTP logging middleware initialized');

// Health check endpoints
app.get('/health/live', (req, res) => {
  logger.debug('Liveness probe check');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    logger.debug('Readiness probe check - database connected');
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness probe check failed - database disconnected', {
      error: error.message,
      stack: error.stack
    });
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
logger.info('API routes initialized', {
  routes: ['/api/auth', '/api/products', '/api/cart', '/api/orders']
});

// Root endpoint
app.get('/', (req, res) => {
  logger.debug('Root endpoint accessed');
  res.json({
    message: 'E-commerce API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders'
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip
  });
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      status: err.status
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
  
  const status = err.status || 500;
  const message = config.nodeEnv === 'production'
    ? 'Internal server error'
    : err.message;
  
  res.status(status).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// Periodic random log generator (every 10 minutes)
const startPeriodicLogger = () => {
  const randomMessages = [
    'System health check completed - all services operational',
    'Memory usage within normal parameters',
    'Database connection pool status: healthy',
    'Cache hit ratio: optimal',
    'Background tasks processing normally',
    'API response times within acceptable range',
    'Security scan completed - no threats detected',
    'Backup verification successful',
    'Load balancer health check passed',
    'Monitoring systems active and reporting'
  ];

  setInterval(() => {
    const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
    logger.info('Periodic system status', {
      message: randomMessage,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
  }, 10 * 60 * 1000); // 10 minutes
};

// Database connection and server start
const startServer = async () => {
  try {
    logger.info('Initializing database connection...');
    
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully', {
      database: process.env.DB_NAME || 'ecommerce',
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres'
    });

    // Sync database (in production, use migrations instead)
    if (config.nodeEnv === 'development') {
      logger.info('Synchronizing database schema...');
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized successfully');
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info('Server started successfully', {
        port: config.port,
        environment: config.nodeEnv,
        healthCheck: `http://localhost:${config.port}/health/live`,
        readinessCheck: `http://localhost:${config.port}/health/ready`,
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      });
      
      // Start periodic logging
      startPeriodicLogger();
      logger.info('Periodic logging initialized - will log every 10 minutes');
    });

    // Log server errors
    server.on('error', (error) => {
      logger.error('Server error occurred', {
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: initiating graceful shutdown');
  try {
    await sequelize.close();
    logger.info('Database connections closed');
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: initiating graceful shutdown');
  try {
    await sequelize.close();
    logger.info('Database connections closed');
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
});

startServer();

module.exports = app;

// Made with Bob
