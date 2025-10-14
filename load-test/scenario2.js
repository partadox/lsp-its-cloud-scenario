import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const requestDuration = new Trend('request_duration');
const requestsPerSecond = new Counter('requests_per_second');
const httpErrors = new Counter('http_errors');

// Test configuration - High Concurrency
export const options = {
  stages: [
    { duration: '1m', target: 100 },    // Ramp up to 100 users
    { duration: '2m', target: 500 },    // Ramp up to 500 users
    { duration: '2m', target: 1000 },   // Ramp up to 1000 users
    { duration: '3m', target: 1000 },   // Stay at 1000 users
    { duration: '1m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests should complete within 800ms
    'error_rate': ['rate<0.05'],      // Error rate should be less than 5%
    'requests_per_second': ['count>500'], // Should handle at least 500 RPS
  },
};

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Setting up load test - High Concurrency');
  
  // Get authentication token for API calls if needed
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    username: 'user1',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  // Return data for the test
  return {
    token: loginRes.json('token'),
  };
}

// Default function (runs for each virtual user)
export default function(data) {
  // Common headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  // Simulate read-heavy workload with occasional writes
  // We'll use a mix of 90% reads and 10% writes
  const isWrite = Math.random() < 0.1;
  
  if (isWrite) {
    // POST new order - this is a write operation
    const payload = JSON.stringify({
      product_id: Math.floor(Math.random() * 5) + 1, // Random product ID between 1 and 5
      quantity: Math.floor(Math.random() * 5) + 1, // Random quantity between 1 and 5
      shipping_address: '123 Test Street, Test City, Test Country',
    });
    
    const orderRes = http.post('http://localhost:3000/api/orders', payload, {
      headers: headers,
    });
    
    // Record metrics
    requestsPerSecond.add(1);
    requestDuration.add(orderRes.timings.duration);
    
    // Check if request was successful
    const orderSuccess = check(orderRes, {
      'order creation is 201': (r) => r.status === 201,
      'order has order_id': (r) => r.json().order_id !== undefined,
    });
    
    if (!orderSuccess) {
      httpErrors.add(1);
    }
    
    errorRate.add(!orderSuccess);
    successRate.add(orderSuccess);
    
    // More expensive operation, sleep a bit longer
    sleep(0.5);
  } else {
    // Read operations - 90% of traffic
    
    // Use batch requests to simulate high throughput
    const requests = [
      {
        method: 'GET',
        url: 'http://localhost:3000/api/products',
        headers: headers,
      },
      {
        method: 'GET',
        url: `http://localhost:3000/api/products/${Math.floor(Math.random() * 5) + 1}`, // Random product
        headers: headers,
      },
      {
        method: 'GET',
        url: 'http://localhost:3000/api/orders',
        headers: headers,
      },
    ];
    
    // Execute batch requests
    const responses = http.batch(requests);
    
    // Record metrics for each response
    responses.forEach((res, index) => {
      requestsPerSecond.add(1);
      requestDuration.add(res.timings.duration);
      
      // Check if request was successful
      const success = check(res, {
        [`request ${index} status is 200`]: (r) => r.status === 200,
      });
      
      if (!success) {
        httpErrors.add(1);
      }
      
      errorRate.add(!success);
      successRate.add(success);
    });
    
    // Very short sleep to simulate high concurrency
    sleep(0.1);
  }
  
  // Randomly execute an expensive operation to create spikes
  if (Math.random() < 0.01) {  // 1% chance
    // GET all products with sorting/filtering - more expensive operation
    const expensiveRes = http.get('http://localhost:3000/api/products?sort=price&order=desc&limit=100', {
      headers: headers,
    });
    
    requestsPerSecond.add(1);
    requestDuration.add(expensiveRes.timings.duration);
    
    const expensiveSuccess = check(expensiveRes, {
      'expensive operation is 200': (r) => r.status === 200,
    });
    
    if (!expensiveSuccess) {
      httpErrors.add(1);
    }
    
    errorRate.add(!expensiveSuccess);
    successRate.add(expensiveSuccess);
    
    // Sleep a bit longer after expensive operation
    sleep(0.3);
  }
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Completed load test - High Concurrency');
}
