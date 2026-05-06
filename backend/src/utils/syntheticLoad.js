const axios = require('axios');
const { logger } = require('./logger');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOAD_INTERVAL = parseInt(process.env.SYNTHETIC_LOAD_INTERVAL) || 10000; // 10 seconds
const ENABLED = process.env.SYNTHETIC_LOAD_ENABLED !== 'false'; // Enabled by default
const CONCURRENT_REQUESTS = parseInt(process.env.SYNTHETIC_CONCURRENT_REQUESTS) || 3; // Multiple requests per interval

// Sample data for synthetic requests
const sampleUsers = [
  { email: 'test1@example.com', password: 'Test123!@#' },
  { email: 'test2@example.com', password: 'Test123!@#' },
  { email: 'test3@example.com', password: 'Test123!@#' }
];

const sampleProducts = [1, 2, 3, 4, 5];

// Create axios instance for internal calls
const internalApi = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SyntheticLoadGenerator/1.0'
  }
});

// Synthetic load scenarios
const scenarios = [
  {
    name: 'Health Check',
    weight: 30,
    execute: async () => {
      await internalApi.get('/health/live');
      await internalApi.get('/health/ready');
    }
  },
  {
    name: 'Browse Products',
    weight: 25,
    execute: async () => {
      await internalApi.get('/api/products');
      const productId = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
      await internalApi.get(`/api/products/${productId}`);
    }
  },
  {
    name: 'Get Categories',
    weight: 15,
    execute: async () => {
      await internalApi.get('/api/products/categories');
    }
  },
  {
    name: 'Search Products',
    weight: 10,
    execute: async () => {
      const searchTerms = ['laptop', 'phone', 'tablet', 'watch', 'camera'];
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      await internalApi.get(`/api/products?search=${term}`);
    }
  },
  {
    name: 'User Login Flow',
    weight: 10,
    execute: async () => {
      const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      try {
        const response = await internalApi.post('/api/auth/login', user);
        const token = response.data.token;
        
        // Get user profile
        await internalApi.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Get cart
        await internalApi.get('/api/cart', {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        // Login might fail if user doesn't exist, that's ok
        logger.debug('Synthetic login attempt failed (expected if user not seeded)', {
          email: user.email
        });
      }
    }
  },
  {
    name: 'Browse by Category',
    weight: 10,
    execute: async () => {
      const categories = ['Electronics', 'Clothing', 'Books', 'Home'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      await internalApi.get(`/api/products/category/${category}`);
    }
  }
];

// Calculate cumulative weights for weighted random selection
const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
const cumulativeWeights = [];
let cumulative = 0;
scenarios.forEach(scenario => {
  cumulative += scenario.weight;
  cumulativeWeights.push({ scenario, threshold: cumulative / totalWeight });
});

// Select a random scenario based on weights
function selectScenario() {
  const random = Math.random();
  for (const { scenario, threshold } of cumulativeWeights) {
    if (random <= threshold) {
      return scenario;
    }
  }
  return scenarios[0]; // Fallback
}

// Execute a single synthetic request
async function executeSyntheticRequest() {
  const scenario = selectScenario();
  const startTime = Date.now();
  
  try {
    logger.debug('Executing synthetic load scenario', {
      scenario: scenario.name,
      timestamp: new Date().toISOString()
    });
    
    await scenario.execute();
    
    const duration = Date.now() - startTime;
    logger.info('Synthetic load scenario completed', {
      scenario: scenario.name,
      duration: `${duration}ms`,
      success: true
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.warn('Synthetic load scenario failed', {
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

// Start synthetic load generator
function startSyntheticLoad() {
  if (!ENABLED) {
    logger.info('Synthetic load generator is disabled');
    return;
  }

  logger.info('Starting synthetic load generator', {
    baseUrl: BASE_URL,
    interval: `${LOAD_INTERVAL}ms`,
    concurrentRequests: CONCURRENT_REQUESTS,
    scenarios: scenarios.map(s => ({ name: s.name, weight: s.weight }))
  });

  // Execute immediately on start
  executeMultipleRequests();

  // Then execute periodically
  setInterval(() => {
    executeMultipleRequests();
  }, LOAD_INTERVAL);
}

// Stop synthetic load (for graceful shutdown)
function stopSyntheticLoad() {
  logger.info('Stopping synthetic load generator');
  // Intervals will be cleared when process exits
}

module.exports = {
  startSyntheticLoad,
  stopSyntheticLoad
};

// Made with Bob