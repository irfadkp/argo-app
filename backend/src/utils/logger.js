const winston = require('winston');
const config = require('../config/app');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { 
    service: 'ecommerce-backend',
    environment: config.nodeEnv,
    hostname: process.env.HOSTNAME || 'unknown',
    pod: process.env.POD_NAME || 'local'
  },
  transports: [
    // Console transport - always enabled for K8s logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          
          // Add metadata if present
          const metaKeys = Object.keys(metadata).filter(
            key => !['service', 'environment', 'hostname', 'pod', 'timestamp', 'level', 'message'].includes(key)
          );
          
          if (metaKeys.length > 0) {
            const filteredMeta = {};
            metaKeys.forEach(key => {
              filteredMeta[key] = metadata[key];
            });
            msg += ` | ${JSON.stringify(filteredMeta)}`;
          }
          
          return msg;
        })
      )
    })
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// Create request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    requestId: req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
      ip: req.ip || req.connection.remoteAddress
    });
    
    return originalSend.call(this, data);
  };

  next();
};

// Helper functions for structured logging
const logWithContext = (level, message, context = {}) => {
  logger[level](message, context);
};

const logError = (error, context = {}) => {
  logger.error(error.message, {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    }
  });
};

const logDatabaseQuery = (query, duration, context = {}) => {
  logger.debug('Database query executed', {
    ...context,
    query: query.substring(0, 200), // Limit query length
    duration: `${duration}ms`
  });
};

const logAuthAttempt = (email, success, reason = null, context = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication attempt', {
    ...context,
    email,
    success,
    reason
  });
};

const logBusinessEvent = (event, data = {}) => {
  logger.info('Business event', {
    event,
    ...data
  });
};

module.exports = {
  logger,
  requestLogger,
  logWithContext,
  logError,
  logDatabaseQuery,
  logAuthAttempt,
  logBusinessEvent
};

// Made with Bob