# 🧪 Local Testing Guide

Complete guide to test the e-commerce application locally before deploying to Kubernetes.

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 15+
- Git

## Quick Start (5 minutes)

### 1. Setup Database

```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-15
sudo systemctl start postgresql

# Create database and user
psql postgres
```

In PostgreSQL shell:
```sql
CREATE DATABASE ecommerce;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce TO postgres;
\q
```

### 2. Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env if needed (default values work for local testing)
# The default configuration:
# - PORT=3000
# - DATABASE_HOST=localhost
# - DATABASE_PORT=5432
# - DATABASE_NAME=ecommerce
# - DATABASE_USER=postgres
# - DATABASE_PASSWORD=password

# Seed database with sample data
npm run seed

# Start backend server
npm start
```

**Expected output:**
```
[INFO] Database connected successfully
[INFO] Server running on port 3000
[INFO] Environment: development
[INFO] Synthetic load generator started - 26 requests/minute
```

### 3. Setup Frontend

Open a **new terminal**:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v5.0.11  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 4. Access Application

Open your browser: **http://localhost:5173**

## 🧪 Testing Checklist

### Basic Functionality

- [ ] **Homepage loads** - Should show product grid
- [ ] **Products display** - Should see 10 sample products
- [ ] **Navigation works** - Click through different pages

### Authentication

- [ ] **Register new user**
  - Click "Register"
  - Fill form: email, password, name
  - Should redirect to login

- [ ] **Login with test user**
  - Email: `user@example.com`
  - Password: `user123`
  - Should redirect to homepage with "Logout" button

- [ ] **Login with admin**
  - Email: `admin@example.com`
  - Password: `admin123`
  - Should see admin features

### Shopping Flow

- [ ] **View product details**
  - Click on any product
  - Should show full details, price, stock

- [ ] **Add to cart**
  - Click "Add to Cart"
  - Cart icon should update with count

- [ ] **View cart**
  - Click cart icon
  - Should show added items
  - Test quantity update (+/-)
  - Test remove item

- [ ] **Checkout**
  - Click "Proceed to Checkout"
  - Fill shipping address
  - Click "Place Order"
  - Should see success message

- [ ] **View orders**
  - Click "Orders" in navigation
  - Should see placed order with status

### Admin Features (login as admin)

- [ ] **Create product**
  - Navigate to admin section
  - Add new product with details
  - Should appear in product list

- [ ] **Update product**
  - Edit existing product
  - Change price or stock
  - Should reflect changes

- [ ] **Delete product**
  - Remove a product
  - Should disappear from list

## 📊 Verify Logging

### Backend Logs

In the backend terminal, you should see:

```
[INFO] User logged in successfully { userId: 1, email: 'user@example.com' }
[INFO] Products fetched { count: 10, filters: {} }
[INFO] Item added to cart { userId: 1, productId: 5, quantity: 1 }
[INFO] Order created successfully { orderId: 1, userId: 1, total: 299.99 }
```

### Frontend Logs

Open browser console (F12), you should see:

```
[INFO] App initialized { environment: 'development', apiUrl: 'http://localhost:3000' }
[INFO] API Request: GET /api/products
[INFO] API Response: GET /api/products (125ms)
[INFO] User logged in { userId: 1 }
```

### Synthetic Load

Both backend and frontend generate synthetic load automatically:

**Backend** (26 requests/minute):
- Health checks
- Product listings
- User registrations
- Cart operations
- Order creation

**Frontend** (user simulation):
- Page navigation
- Product browsing
- Cart interactions

Check logs to verify synthetic requests are running.

## 🔍 API Testing with curl

### Health Check
```bash
curl http://localhost:3000/health/ready
# Expected: {"status":"ok","database":"connected"}
```

### Get Products
```bash
curl http://localhost:3000/api/products
# Expected: JSON array of products
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'
# Expected: {"token":"...", "user":{...}}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "user123"
  }'
# Expected: {"token":"...", "user":{...}}
```

### Get Cart (requires auth)
```bash
# First login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}' \
  | jq -r '.token')

# Then get cart
curl http://localhost:3000/api/cart \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"items":[...], "total":...}
```

## 🐛 Troubleshooting

### Backend won't start

**Error: "Database connection failed"**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Check database exists
psql -U postgres -l | grep ecommerce

# Recreate database if needed
psql -U postgres -c "DROP DATABASE IF EXISTS ecommerce;"
psql -U postgres -c "CREATE DATABASE ecommerce;"
cd backend && npm run seed
```

**Error: "Port 3000 already in use"**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in backend/.env
PORT=3001
```

**Error: "Cannot find module"**
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend won't start

**Error: "Port 5173 already in use"**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Error: "Cannot connect to backend"**
```bash
# Verify backend is running
curl http://localhost:3000/health/ready

# Check CORS settings in backend/.env
CORS_ORIGIN=http://localhost:5173
```

**Error: "Module not found"**
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

**Reset database completely**
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS ecommerce;"
psql -U postgres -c "CREATE DATABASE ecommerce;"

# Reseed
cd backend
npm run seed
```

**View database contents**
```bash
# Connect to database
psql -U postgres -d ecommerce

# List tables
\dt

# View users
SELECT * FROM users;

# View products
SELECT * FROM products;

# View orders
SELECT * FROM orders;

# Exit
\q
```

## 🔧 Development Tips

### Hot Reload

- **Backend**: Use `npm run dev` instead of `npm start` for auto-restart on file changes
- **Frontend**: Vite automatically hot-reloads on file changes

### Debug Mode

Enable debug logging:

**Backend** (.env):
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

**Frontend** (browser console):
```javascript
localStorage.setItem('logLevel', 'debug')
// Refresh page
```

### Test Different Scenarios

**Test error handling:**
```bash
# Invalid login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrong"}'

# Invalid product ID
curl http://localhost:3000/api/products/99999
```

**Test rate limiting:**
```bash
# Send 100+ requests quickly
for i in {1..150}; do
  curl http://localhost:3000/api/products &
done
# Should see 429 Too Many Requests after 100 requests
```

## 📈 Performance Testing

### Load Testing with Apache Bench

```bash
# Install Apache Bench
brew install httpd  # macOS
sudo apt-get install apache2-utils  # Linux

# Test product listing
ab -n 1000 -c 10 http://localhost:3000/api/products

# Test with authentication
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/cart
```

### Monitor Resource Usage

```bash
# Backend memory/CPU
ps aux | grep node

# Database connections
psql -U postgres -d ecommerce -c "SELECT count(*) FROM pg_stat_activity;"
```

## ✅ Ready for Kubernetes?

Once local testing is complete:

1. **All tests passing** ✓
2. **Logs showing correctly** ✓
3. **Synthetic load running** ✓
4. **No errors in console** ✓

**Next steps:**
- Follow [QUICKSTART.md](../QUICKSTART.md) for Kubernetes deployment
- Or follow [MANUAL-DEPLOYMENT.md](MANUAL-DEPLOYMENT.md) for manual deployment

## 🎯 Quick Test Script

Save this as `test-local.sh`:

```bash
#!/bin/bash

echo "🧪 Testing E-commerce Application Locally"
echo "=========================================="

# Test backend health
echo -n "Backend health check... "
if curl -s http://localhost:3000/health/ready | grep -q "ok"; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test products endpoint
echo -n "Products endpoint... "
if curl -s http://localhost:3000/api/products | grep -q "id"; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

# Test frontend
echo -n "Frontend accessible... "
if curl -s http://localhost:5173 | grep -q "root"; then
  echo "✅ PASS"
else
  echo "❌ FAIL"
  exit 1
fi

echo ""
echo "✅ All tests passed! Application is working locally."
echo "🚀 Ready to deploy to Kubernetes!"
```

Run it:
```bash
chmod +x test-local.sh
./test-local.sh
```

## 📚 Additional Resources

- [Backend API Documentation](../backend/README.md)
- [Frontend Documentation](../frontend/README.md)
- [Logging Guide](LOGGING.md)
- [Instana Setup](INSTANA-SETUP.md)

---

**Made with Bob** 🤖