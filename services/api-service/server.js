const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const prometheus = require('prom-client');
const morgan = require('morgan');
const winston = require('winston');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Load API configuration
const apiConfig = require('../init/02-api.js');

// Environment variables for connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'app_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Redis configuration
const redisConfig = {
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
};

// Initialize Prometheus metrics
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'api_http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

const httpRequestCounter = new prometheus.Counter({
  name: 'api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'api_database_query_duration_ms',
  help: 'Duration of database queries in ms',
  labelNames: ['query', 'error'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
});

const cacheHitCounter = new prometheus.Counter({
  name: 'api_cache_hit_total',
  help: 'Total number of cache hits'
});

const cacheMissCounter = new prometheus.Counter({
  name: 'api_cache_miss_total',
  help: 'Total number of cache misses'
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later'
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(limiter);

// Request duration middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestCounter
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
});

// Initialize MySQL connection pool
let dbPool;
async function initializeDatabase() {
  try {
    dbPool = await mysql.createPool(dbConfig);
    console.log('MySQL connection pool initialized');
    
    // Verify connection
    const [results] = await dbPool.query('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Error initializing database connection:', error);
    process.exit(1);
  }
}

// Initialize Redis client
let redisClient;
async function initializeRedis() {
  try {
    redisClient = redis.createClient(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    await redisClient.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.error('Error initializing Redis connection:', error);
    console.warn('Continuing without Redis cache');
  }
}

// Database query wrapper with metrics
async function executeQuery(queryName, query, params = []) {
  const start = Date.now();
  try {
    const [results] = await dbPool.query(query, params);
    const duration = Date.now() - start;
    
    databaseQueryDuration
      .labels(queryName, 'false')
      .observe(duration);
    
    return results;
  } catch (error) {
    const duration = Date.now() - start;
    
    databaseQueryDuration
      .labels(queryName, 'true')
      .observe(duration);
    
    throw error;
  }
}

// Cache middleware
async function cacheMiddleware(req, res, next) {
  if (!redisClient || !redisClient.isReady) {
    return next();
  }
  
  const key = `api:${req.originalUrl}`;
  
  try {
    const cachedData = await redisClient.get(key);
    
    if (cachedData) {
      cacheHitCounter.inc();
      const data = JSON.parse(cachedData);
      return res.status(200).json(data);
    } else {
      cacheMissCounter.inc();
      
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function
      res.send = async function(body) {
        // If it's a successful GET request, cache the response
        if (req.method === 'GET' && res.statusCode === 200) {
          try {
            await redisClient.set(key, body, {
              EX: 300 // Cache for 5 minutes
            });
          } catch (err) {
            console.error('Redis cache error:', err);
          }
        }
        
        // Call the original send function
        return originalSend.call(this, body);
      };
      
      next();
    }
  } catch (error) {
    console.error('Cache error:', error);
    next();
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// User routes
app.get('/api/users', authenticate, cacheMiddleware, async (req, res) => {
  try {
    const users = await executeQuery(
      'get_users',
      'SELECT id, username, email, created_at, updated_at FROM users'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', authenticate, cacheMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const users = await executeQuery(
      'get_user_by_id',
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Product routes
app.get('/api/products', cacheMiddleware, async (req, res) => {
  try {
    const products = await executeQuery(
      'get_products',
      'SELECT * FROM products'
    );
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', cacheMiddleware, async (req, res) => {
  try {
    const productId = req.params.id;
    const products = await executeQuery(
      'get_product_by_id',
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(products[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Order routes
app.get('/api/orders', authenticate, cacheMiddleware, async (req, res) => {
  try {
    const orders = await executeQuery(
      'get_orders',
      'SELECT * FROM orders WHERE user_id = ?',
      [req.user.id]
    );
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', authenticate, async (req, res) => {
  try {
    const { product_id, quantity, shipping_address } = req.body;
    
    if (!product_id || !quantity || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Use the stored procedure for order processing
    const result = await executeQuery(
      'process_order',
      'CALL process_order(?, ?, ?, ?)',
      [req.user.id, product_id, quantity, shipping_address]
    );
    
    if (result[0].order_id === 0) {
      return res.status(400).json({ error: result[0].message });
    }
    
    res.status(201).json({
      message: 'Order created successfully',
      order_id: result[0].order_id
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const users = await executeQuery(
      'get_user_by_username',
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Initialize and start the server
async function startServer() {
  await initializeDatabase();
  await initializeRedis();
  
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  if (redisClient && redisClient.isReady) {
    await redisClient.quit();
  }
  
  if (dbPool) {
    await dbPool.end();
  }
  
  process.exit(0);
});
