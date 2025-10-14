import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const requestDuration = new Trend('request_duration');
const requestsPerSecond = new Counter('requests_per_second');
const failoverTime = new Trend('failover_time');

// Test configuration - Fault Tolerance and Recovery
export const options = {
  stages: [
    { duration: '1m', target: 200 },   // Ramp up to 200 users
    { duration: '2m', target: 200 },   // Stay at 200 users (steady state)
    { duration: '30s', target: 200 },  // Continue steady state while we trigger failure
    { duration: '1m', target: 200 },   // Continue during recovery
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should complete within 1s even during failover
    'error_rate': ['rate<0.1'],        // Error rate should be less than 10% even during failover
    'failover_time': ['p(99)<30000'],  // 99% of failovers should complete within 30s
  },
};

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Setting up load test - Fault Tolerance and Recovery');
  
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
    failoverTriggered: false,
    failoverStartTime: 0,
  };
}

// Default function (runs for each virtual user)
export default function(data) {
  // Common headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };
  
  // Check for failover trigger time (after 3 minutes)
  if (!data.failoverTriggered && exec.scenario.iterationInTest > 0 && exec.scenario.progress > 0.5) {
    console.log('Triggering failover event at progress: ' + exec.scenario.progress);
    data.failoverTriggered = true;
    data.failoverStartTime = Date.now();
    
    // Note: In a real test, you would trigger failover via an external mechanism
    // This could be done by calling an admin API or through direct container manipulation
    // For this simulation, we'll just log it and then continue testing to observe recovery
    console.log('Failover event triggered at: ' + data.failoverStartTime);
  }
  
  // Measure failover time if in recovery period
  if (data.failoverTriggered && data.failoverStartTime > 0) {
    failoverTime.add(Date.now() - data.failoverStartTime);
  }
  
  // GET products (main test of API availability)
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
  
  // Add some variation to the sleep time
  sleep(Math.random() * 0.5 + 0.5);  // Sleep between 0.5s and 1s
  
  // GET a single product
  const productId = Math.floor(Math.random() * 5) + 1; // Random product ID between 1 and 5
  const productRes = http.get(`http://localhost:3000/api/products/${productId}`, {
    headers: headers,
  });
  
  // Record metrics
  requestsPerSecond.add(1);
  requestDuration.add(productRes.timings.duration);
  
  // Check if request was successful
  const productSuccess = check(productRes, {
    'product status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 is acceptable during failover
    'product has id if found': (r) => r.status !== 200 || r.json().id !== undefined,
  });
  
  errorRate.add(!productSuccess);
  successRate.add(productSuccess);
  
  // Only attempt writes 5% of the time
  if (Math.random() < 0.05) {
    // POST new order (testing write operations during failover)
    const payload = JSON.stringify({
      product_id: productId,
      quantity: 1,
      shipping_address: '123 Test Street, Test City, Test Country',
    });
    
    const orderRes = http.post('http://localhost:3000/api/orders', payload, {
      headers: headers,
    });
    
    // Record metrics
    requestsPerSecond.add(1);
    requestDuration.add(orderRes.timings.duration);
    
    // During failover, both success and failure of writes are acceptable
    // But we still log the actual outcome
    const orderSuccess = check(orderRes, {
      'order status is 201 or 503': (r) => r.status === 201 || r.status === 503, // 503 is acceptable during failover
      'order has order_id if created': (r) => r.status !== 201 || r.json().order_id !== undefined,
    });
    
    errorRate.add(!orderSuccess);
    successRate.add(orderSuccess);
  }
  
  // Sleep a bit longer between iterations to give system time to recover
  sleep(Math.random() * 1 + 1);  // Sleep between 1s and 2s
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Completed load test - Fault Tolerance and Recovery');
  
  if (data.failoverTriggered) {
    const totalFailoverTime = (Date.now() - data.failoverStartTime) / 1000;
    console.log(`Total failover duration: ${totalFailoverTime} seconds`);
  }
}
