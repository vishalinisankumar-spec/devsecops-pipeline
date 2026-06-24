const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database(':memory:');

// Create tables
db.run(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT
  )
`);

db.run(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT
  )
`);

// Insert sample products
db.run(`INSERT INTO products (name, price, description) VALUES ('Laptop', 999.99, 'High-performance laptop')`);
db.run(`INSERT INTO products (name, price, description) VALUES ('Mouse', 29.99, 'Wireless mouse')`);

// ========== VULNERABILITY 1: Hardcoded Credentials ==========
const SECRET_API_KEY = "sk-super-secret-key-12345";
const DB_PASSWORD = "admin123";

// ========== VULNERABILITY 2: SQL Injection ==========
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // VULNERABLE: Direct SQL concatenation
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  db.get(query, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      res.json({ message: 'Login successful', userId: row.id });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

// ========== VULNERABILITY 3: Cross-Site Scripting (XSS) ==========
app.get('/search', (req, res) => {
  const { query } = req.query;
  
  // VULNERABLE: Unsanitized user input directly in response
  const response = `<html><body>Search results for: ${query}</body></html>`;
  res.send(response);
});

// ========== VULNERABILITY 4: Missing Input Validation ==========
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  
  // VULNERABLE: No input validation
  db.run(
    `INSERT INTO users (username, password, email) VALUES (?, ?, ?)`,
    [username, password, email],
    (err) => {
      if (err) {
        return res.status(400).json({ error: 'Registration failed' });
      }
      res.status(201).json({ message: 'User registered' });
    }
  );
});

// ========== VULNERABILITY 5: Insecure Direct Object Reference (IDOR) ==========
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  
  // VULNERABLE: No authorization check
  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (row) {
      // VULNERABLE: Exposing sensitive user data
      res.json(row);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });
});

// ========== VULNERABILITY 6: Missing Authentication ==========
app.delete('/user/:id', (req, res) => {
  const userId = req.params.id;
  
  // VULNERABLE: No authentication/authorization check
  db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Delete failed' });
    }
    res.json({ message: 'User deleted', changes: this.changes });
  });
});

// ========== VULNERABILITY 7: Sensitive Data Exposure ==========
app.get('/products', (req, res) => {
  db.all(`SELECT * FROM products`, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // VULNERABLE: No HTTPS enforcement mentioned, plaintext data
    res.json(rows);
  });
});

// ========== VULNERABILITY 8: Unsafe Dependency ==========
const lodash = require('lodash');

app.post('/config', (req, res) => {
  const userConfig = req.body;
  
  // VULNERABLE: Using old lodash version (4.17.15 has CVEs)
  const merged = lodash.merge({}, userConfig);
  
  res.json({ config: merged });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`E-commerce app running on http://localhost:${PORT}`);
});

module.exports = app;
