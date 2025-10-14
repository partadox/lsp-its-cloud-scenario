import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const requestDuration = new Trend('request_duration');
const requestsPerSecond = new Counter('requests_per_second');

// Test configuration - Basic Containerization
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
    'error_rate': ['rate<0.1'],       // Error rate should be less than 10%
    'requests_per_second': ['count>10'], // Should handle at least 10 RPS
  },
};

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Setting up load test - Basic Containerization');
  
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
  
  // GET products
  const productsRes = http.get('http://localhost:3000/api/products', {
    headers: headers,
  });
  
  // Record metrics
  requestsPerSecond.add(1);
  requestDuration.add(productsRes.timings.duration);
  
  // Check if request was successful
  const productsSuccess = check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products has data': (r) => r.json().length > 0,
  });
  
  errorRate.add(!productsSuccess);
  successRate.add(productsSuccess);
  
  // Sleep between requests
  sleep(1);
  
  // GET single product (first product from list or hardcoded ID if list is empty)
  let productId = 1; // Fallback product ID
  if (productsRes.json().length > 0) {
    productId = productsRes.json()[0].id;
  }
  
  const productRes = http.get(`http://localhost:3000/api/products/${productId}`, {
    headers: headers,
  });
  
  // Record metrics
  requestsPerSecond.add(1);
  requestDuration.add(productRes.timings.duration);
  
  // Check if request was successful
  const productSuccess = check(productRes, {
    'product status is 200': (r) => r.status === 200,
    'product has correct id': (r) => r.json().id === productId,
  });
  
  errorRate.add(!productSuccess);
  successRate.add(productSuccess);
  
  // Sleep between requests
  sleep(1);
  
  // GET user profile
  const userRes = http.get('http://localhost:3000/api/users/1', {
    headers: headers,
  });
  
  // Record metrics
  requestsPerSecond.add(1);
  requestDuration.add(userRes.timings.duration);
  
  // Check if request was successful
  const userSuccess = check(userRes, {
    'user status is 200': (r) => r.status === 200,
  });
  
  errorRate.add(!userSuccess);
  successRate.add(userSuccess);
  
  // Sleep before next iteration
  sleep(2);
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Completed load test - Basic Containerization');
}
