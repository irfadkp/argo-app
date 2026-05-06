// Frontend Logger Utility
// Provides structured logging for browser console with different log levels

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    // Set log level based on environment
    this.logLevel = import.meta.env.MODE === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    this.appName = 'ecommerce-frontend';
    this.environment = import.meta.env.MODE || 'development';
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] >= this.logLevel;
  }

  _formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      app: this.appName,
      environment: this.environment,
      message,
      ...context
    };
    return logEntry;
  }

  _log(level, message, context = {}) {
    if (!this._shouldLog(level)) return;

    const logEntry = this._formatMessage(level, message, context);
    const consoleMethod = level === 'ERROR' ? 'error' : 
                         level === 'WARN' ? 'warn' : 
                         level === 'INFO' ? 'info' : 'log';

    // Pretty print in development, structured in production
    if (this.environment === 'development') {
      console[consoleMethod](
        `[${logEntry.timestamp}] [${level}] ${message}`,
        Object.keys(context).length > 0 ? context : ''
      );
    } else {
      console[consoleMethod](JSON.stringify(logEntry));
    }
  }

  debug(message, context = {}) {
    this._log('DEBUG', message, context);
  }

  info(message, context = {}) {
    this._log('INFO', message, context);
  }

  warn(message, context = {}) {
    this._log('WARN', message, context);
  }

  error(message, context = {}) {
    this._log('ERROR', message, context);
  }

  // API request logging
  logApiRequest(method, url, data = null) {
    this.info('API Request', {
      method,
      url,
      hasData: !!data,
      timestamp: new Date().toISOString()
    });
  }

  // API response logging
  logApiResponse(method, url, status, duration) {
    const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    this._log(level, 'API Response', {
      method,
      url,
      status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }

  // API error logging
  logApiError(method, url, error) {
    this.error('API Error', {
      method,
      url,
      error: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      },
      timestamp: new Date().toISOString()
    });
  }

  // User action logging
  logUserAction(action, details = {}) {
    this.info('User Action', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Navigation logging
  logNavigation(from, to) {
    this.debug('Navigation', {
      from,
      to,
      timestamp: new Date().toISOString()
    });
  }

  // Component lifecycle logging
  logComponentMount(componentName, props = {}) {
    this.debug('Component Mounted', {
      component: componentName,
      props: Object.keys(props),
      timestamp: new Date().toISOString()
    });
  }

  logComponentUnmount(componentName) {
    this.debug('Component Unmounted', {
      component: componentName,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  logPerformance(metric, value, unit = 'ms') {
    this.info('Performance Metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString()
    });
  }

  // Business event logging
  logBusinessEvent(event, data = {}) {
    this.info('Business Event', {
      event,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

// Made with Bob