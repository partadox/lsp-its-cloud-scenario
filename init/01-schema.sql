-- Database schema for Cloud Computing Lab

CREATE DATABASE IF NOT EXISTS app_db;
USE app_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_price (price)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);

-- API Logs table for monitoring
CREATE TABLE IF NOT EXISTS api_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time INT NOT NULL, -- in milliseconds
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_endpoint (endpoint),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for testing
INSERT INTO users (username, email, password_hash) VALUES
('user1', 'user1@example.com', '$2a$10$xVQAzVg4a5eG/thx0Pbx8uby91TcY9IxjGK7JzkRkBitTRTm0aCnK'), -- password: password123
('user2', 'user2@example.com', '$2a$10$xVQAzVg4a5eG/thx0Pbx8uby91TcY9IxjGK7JzkRkBitTRTm0aCnK'),
('user3', 'user3@example.com', '$2a$10$xVQAzVg4a5eG/thx0Pbx8uby91TcY9IxjGK7JzkRkBitTRTm0aCnK');

INSERT INTO products (name, description, price, stock, category) VALUES
('Smartphone X', 'Latest smartphone with advanced features', 899.99, 100, 'Electronics'),
('Laptop Pro', 'Professional laptop for developers', 1299.99, 50, 'Electronics'),
('Wireless Earbuds', 'High-quality wireless earbuds', 129.99, 200, 'Audio'),
('Smart Watch', 'Fitness tracking smart watch', 199.99, 75, 'Wearables'),
('Coffee Maker', 'Programmable coffee maker', 89.99, 30, 'Home Appliances');

-- Create stored procedures for concurrency testing
DELIMITER //

CREATE PROCEDURE process_order(IN p_user_id INT, IN p_product_id INT, IN p_quantity INT, IN p_address TEXT)
BEGIN
    DECLARE v_price DECIMAL(10, 2);
    DECLARE v_current_stock INT;
    DECLARE v_order_id INT;
    DECLARE v_total_amount DECIMAL(10, 2);
    
    -- Start transaction
    START TRANSACTION;
    
    -- Get product price and check stock
    SELECT price, stock INTO v_price, v_current_stock
    FROM products 
    WHERE id = p_product_id
    FOR UPDATE; -- Lock row for update
    
    IF v_current_stock >= p_quantity THEN
        -- Update stock
        UPDATE products
        SET stock = stock - p_quantity
        WHERE id = p_product_id;
        
        -- Calculate total amount
        SET v_total_amount = v_price * p_quantity;
        
        -- Create order
        INSERT INTO orders (user_id, total_amount, shipping_address)
        VALUES (p_user_id, v_total_amount, p_address);
        
        -- Get order ID
        SET v_order_id = LAST_INSERT_ID();
        
        -- Add order item
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, p_product_id, p_quantity, v_price);
        
        -- Commit transaction
        COMMIT;
        
        -- Return order ID (success)
        SELECT v_order_id AS order_id, 'Order processed successfully' AS message;
    ELSE
        -- Rollback transaction
        ROLLBACK;
        
        -- Return error message
        SELECT 0 AS order_id, 'Insufficient stock' AS message;
    END IF;
END //

DELIMITER ;
