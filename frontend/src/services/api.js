import { API_BASE_URL } from '../config/api';
import axios from 'axios';
import logger from '../utils/logger';

logger.info('API Service initialized', {
  baseURL: API_BASE_URL,
  timestamp: new Date().toISOString()
});

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    // Add request timestamp for duration calculation
    config.metadata = { startTime: new Date() };
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      logger.debug('Auth token added to request', {
        url: config.url,
        method: config.method
      });
    }

    // Log the request
    logger.logApiRequest(
      config.method.toUpperCase(),
      config.url,
      config.data
    );

    logger.debug('API Request Details', {
      method: config.method.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization ? '[REDACTED]' : undefined
      },
      params: config.params,
      hasData: !!config.data
    });

    return config;
  },
  (error) => {
    logger.error('Request interceptor error', {
      error: error.message,
      stack: error.stack
    });
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and log responses
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log the response
    logger.logApiResponse(
      response.config.method.toUpperCase(),
      response.config.url,
      response.status,
      duration
    );

    logger.debug('API Response Details', {
      method: response.config.method.toUpperCase(),
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      dataSize: JSON.stringify(response.data).length
    });

    return response;
  },
  (error) => {
    // Calculate request duration if available
    const duration = error.config?.metadata?.startTime
      ? new Date() - error.config.metadata.startTime
      : null;

    // Log the error
    logger.logApiError(
      error.config?.method?.toUpperCase() || 'UNKNOWN',
      error.config?.url || 'UNKNOWN',
      error
    );

    logger.error('API Error Details', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: duration ? `${duration}ms` : 'unknown',
      errorMessage: error.message,
      responseData: error.response?.data
    });

    if (error.response?.status === 401) {
      logger.warn('Unauthorized - clearing auth and redirecting to login', {
        url: error.config?.url,
        currentPath: window.location.pathname
      });
      
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      logger.info('User logged out due to 401 response');
      
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Log API service ready
logger.info('API Service ready', {
  baseURL: API_BASE_URL,
  interceptorsConfigured: true
});

export default api;

// Made with Bob
