import { API_ENDPOINTS } from '../config/api';
import api from '../services/api';
import logger from './logger';

// Configuration
const LOAD_INTERVAL = parseInt(import.meta.env.VITE_SYNTHETIC_LOAD_INTERVAL) || 15000; // 15 seconds
const ENABLED = import.meta.env.VITE_SYNTHETIC_LOAD_ENABLED !== 'false'; // Enabled by default
const CONCURRENT_REQUESTS = parseInt(import.meta.env.VITE_SYNTHETIC_CONCURRENT_REQUESTS) || 2;

// Synthetic load scenarios for frontend
const scenarios = [
  {
    name: 'Browse Products',
    weight: 30,
    execute: async () => {
      await api.get(API_ENDPOINTS.PRODUCTS);
      logger.debug('Synthetic: Browsed products');
    }
  },
  {
    name: 'View Product Details',
    weight: 25,
    execute: async () => {
      const productIds = [1, 2, 3, 4, 5];
      const id = productIds[Math.floor(Math.random() * productIds.length)];
      await api.get(API_ENDPOINTS.PRODUCT_BY_ID(id));
      logger.debug('Synthetic: Viewed product details', { productId: id });
    }
  },
  {
    name: 'Get Categories',
    weight: 20,
    execute: async () => {
      await api.get(API_ENDPOINTS.CATEGORIES);
      logger.debug('Synthetic: Fetched categories');
    }
  },
  {
    name: 'Search Products',
    weight: 15,
    execute: async () => {
      const searchTerms = ['laptop', 'phone', 'tablet', 'watch'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      await api.get(`${API_ENDPOINTS.PRODUCTS}?search=${term}`);
      logger.debug('Synthetic: Searched products', { term });
    }
  },
  {
    name: 'Browse by Category',
    weight: 10,
    execute: async () => {
      const categories = ['Electronics', 'Clothing', 'Books'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      await api.get(API_ENDPOINTS.PRODUCTS_BY_CATEGORY(category));
      logger.debug('Synthetic: Browsed category', { category });
    }
  }
];

// Calculate cumulative weights
const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
const cumulativeWeights = [];
let cumulative = 0;
scenarios.forEach(scenario => {
  cumulative += scenario.weight;
  cumulativeWeights.push({ scenario, threshold: cumulative / totalWeight });
});

// Select random scenario based on weights
function selectScenario() {
  const random = Math.random();
  for (const { scenario, threshold } of cumulativeWeights) {
    if (random <= threshold) {
      return scenario;
    }
  }
  return scenarios[0];
}

// Execute a single synthetic request
async function executeSyntheticRequest() {
  const scenario = selectScenario();
  const startTime = Date.now();
  
  try {
    logger.debug('Executing frontend synthetic scenario', {
      scenario: scenario.name
    });
    
    await scenario.execute();
    
    const duration = Date.now() - startTime;
    logger.info('Frontend synthetic scenario completed', {
      scenario: scenario.name,
      duration: `${duration}ms`,
      success: true
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.warn('Frontend synthetic scenario failed', {
      scenario: scenario.name,
      duration: `${duration}ms`,
      success: false,
      error: error.message,
      status: error.response?.status
    });
  }
}

// Execute multiple concurrent requests
async function executeMultipleRequests() {
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(executeSyntheticRequest());
  }
  await Promise.allSettled(promises);
}

let intervalId = null;

// Start synthetic load generator
export function startSyntheticLoad() {
  if (!ENABLED) {
    logger.info('Frontend synthetic load generator is disabled');
    return;
  }

  logger.info('Starting frontend synthetic load generator', {
    interval: `${LOAD_INTERVAL}ms`,
    concurrentRequests: CONCURRENT_REQUESTS,
    scenarios: scenarios.map(s => ({ name: s.name, weight: s.weight }))
  });

  // Execute immediately on start
  executeMultipleRequests();

  // Then execute periodically
  intervalId = setInterval(() => {
    executeMultipleRequests();
  }, LOAD_INTERVAL);
}

// Stop synthetic load
export function stopSyntheticLoad() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Frontend synthetic load generator stopped');
  }
}

// Made with Bob