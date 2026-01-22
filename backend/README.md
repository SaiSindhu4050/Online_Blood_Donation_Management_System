# Backend API - Blood Donation Management System

Express.js REST API backend for the Blood Donation Management System. Provides authentication, donation management, request matching, event management, and inventory tracking.

## 🎯 Overview

The backend provides a comprehensive REST API for:
- User and organization authentication
- Blood donation registration and management
- Blood request creation and donor matching
- Event management for organizations
- Inventory tracking with automatic expiration
- Dashboard data for users and organizations

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** 4.18.2 - Web framework
- **MySQL** - Relational database
- **Sequelize** 6.35.2 - ORM for database operations
- **JWT** (jsonwebtoken) - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **express-validator** - Input validation
- **morgan** - HTTP request logging
- **dotenv** - Environment variable management

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Sequelize database configuration
│   │
│   ├── controllers/             # Route controllers (business logic)
│   │   ├── auth.controller.js   # Authentication logic
│   │   ├── user.controller.js   # User operations
│   │   ├── organization.controller.js  # Organization operations
│   │   ├── donation.controller.js     # Donation CRUD
│   │   ├── request.controller.js      # Request CRUD
│   │   └── event.controller.js        # Event CRUD
│   │
│   ├── middleware/              # Custom middleware
│   │   ├── auth.middleware.js   # JWT authentication
│   │   ├── errorHandler.middleware.js  # Error handling
│   │   └── validation.middleware.js    # Input validation
│   │
│   ├── models/                  # Sequelize models
│   │   ├── User.model.js
│   │   ├── Organization.model.js
│   │   ├── Donation.model.js
│   │   ├── Request.model.js
│   │   ├── Event.model.js
│   │   ├── BloodInventory.model.js
│   │   ├── DonationRescheduleRequest.model.js
│   │   ├── Notification.model.js
│   │   └── index.js             # Model associations
│   │
│   ├── routes/                  # API route definitions
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── organization.routes.js
│   │   ├── donation.routes.js
│   │   ├── request.routes.js
│   │   └── event.routes.js
│   │
│   ├── utils/
│   │   └── generateToken.js     # JWT token generation
│   │
│   └── server.js                 # Application entry point
│
├── db/                           # Database scripts
│   ├── 01_create_database.sql
│   ├── 02_create_tables.sql
│   ├── 03_complete_setup.sql ⭐ (Recommended)
│   ├── 04_donation_queries.sql
│   ├── 05_request_queries.sql
│   ├── 06_user_dashboard_queries.sql
│   ├── 07_organization_dashboard_queries.sql
│   ├── 08_automatic_inventory_features.sql
│   ├── 09_add_requestid_to_donations.sql
│   ├── 10_initialize_inventory_for_all_orgs.sql
│   ├── 11_create_reschedule_requests_table.sql
│   └── README.md                 # Detailed DB documentation
│
├── .env                          # Environment variables (create from env.example)
├── env.example                   # Environment variables template
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MySQL (v8.0 or higher)
- MySQL server running and accessible

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `env.example`):
```bash
cp env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=blood_donation_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

5. Set up the database:
```bash
# Option 1: Complete setup (recommended)
mysql -u root -p < db/03_complete_setup.sql

# Option 2: Step by step
mysql -u root -p < db/01_create_database.sql
mysql -u root -p < db/02_create_tables.sql
mysql -u root -p < db/08_automatic_inventory_features.sql
mysql -u root -p < db/09_add_requestid_to_donations.sql
mysql -u root -p < db/10_initialize_inventory_for_all_orgs.sql
mysql -u root -p < db/11_create_reschedule_requests_table.sql
```

6. Start the server:
```bash
# Development mode (with auto-reload via nodemon)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000` (or the port specified in `.env`)

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/org/register` | Register a new organization | No |
| POST | `/auth/org/login` | Login organization | No |
| GET | `/auth/me` | Get current user/organization | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get user profile | Yes (User) |
| PUT | `/users/profile` | Update user profile | Yes (User) |
| GET | `/users/dashboard` | Get user dashboard data | Yes (User) |

### Organization Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/organizations` | Get all organizations | No |
| GET | `/organizations/profile` | Get organization profile | Yes (Org) |
| PUT | `/organizations/profile` | Update organization profile | Yes (Org) |
| GET | `/organizations/dashboard` | Get organization dashboard | Yes (Org) |
| GET | `/organizations/inventory` | Get blood inventory | Yes (Org) |
| POST | `/organizations/accept-request-donation` | Accept request and donation | Yes (Org) |
| GET | `/organizations/reschedule-requests` | Get reschedule requests | Yes (Org) |
| PUT | `/organizations/reschedule-requests/:id` | Handle reschedule request | Yes (Org) |

### Donation Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/donations` | Create a new donation | Optional |
| GET | `/donations` | Get all donations (with filters) | Yes |
| GET | `/donations/:id` | Get single donation | Yes |
| PUT | `/donations/:id/status` | Update donation status | Yes (Org) |
| DELETE | `/donations/:id` | Delete donation | Yes |
| POST | `/donations/:id/request-reschedule` | Request reschedule | Yes (User) |
| PUT | `/donations/:id/mark-completed` | Mark donation as completed | Yes (User) |

### Request Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/requests` | Create a new blood request | Optional |
| GET | `/requests` | Get all requests (with filters) | No |
| GET | `/requests/:id` | Get single request | No |
| PUT | `/requests/:id` | Update request details | Yes |
| PUT | `/requests/:id/status` | Update request status | Yes |
| POST | `/requests/:id/match` | Match donors to request | No |
| DELETE | `/requests/:id` | Delete request | Yes |

### Event Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/events` | Create a new event | Yes (Org) |
| GET | `/events` | Get all events (with filters) | No |
| GET | `/events/:id` | Get single event | No |
| PUT | `/events/:id` | Update event | Yes (Org) |
| DELETE | `/events/:id` | Delete event | Yes (Org) |
| GET | `/events/:id/registrations` | Get event registrations | Yes (Org) |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### How It Works

1. User/Organization logs in via `/auth/login` or `/auth/org/login`
2. Server validates credentials and returns JWT token
3. Client includes token in subsequent requests:
   ```
   Authorization: Bearer <token>
   ```
4. Server validates token on protected routes

### Token Structure

```json
{
  "id": 1,
  "email": "user@example.com",
  "type": "user" // or "organization"
}
```

### Token Expiration

- Default: 7 days (configurable via `JWT_EXPIRE` in `.env`)
- Format: `7d`, `24h`, `3600s`, etc.

### Protected Routes

Most routes require authentication. Include the token in the `Authorization` header:

```javascript
fetch('http://localhost:5000/api/users/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

## 📊 Database Models

### User Model
- Stores user (donor) information
- Fields: id, name, email, password (hashed), bloodGroup, city, phone, lastDonationAt, etc.

### Organization Model
- Stores organization information
- Fields: id, name, email, password (hashed), city, address, phone, etc.

### Donation Model
- Blood donation registrations
- Fields: id, userId, eventId, requestId, bloodGroup, status, eventDate, etc.
- Relations: belongsTo User, Event, Request

### Request Model
- Blood requests from patients/hospitals
- Fields: id, userId, bloodGroup, units, urgency, city, requiredDate, status, etc.
- Relations: belongsTo User, hasMany RequestDonors

### Event Model
- Donation events organized by organizations
- Fields: id, organizationId, title, description, eventDate, location, status, etc.
- Relations: belongsTo Organization

### BloodInventory Model
- Tracks blood units by organization
- Fields: id, organizationId, donationId, bloodGroup, donationType, units, expirationDate, status
- Relations: belongsTo Organization, Donation

### DonationRescheduleRequest Model
- Rescheduling requests from users
- Fields: id, donationId, requestedDate, reason, status
- Relations: belongsTo Donation

### Notification Model
- User/organization notifications
- Fields: id, userId, organizationId, type, message, isRead
- Relations: belongsTo User, Organization

## 🔄 Automatic Features

### Inventory Management

The system includes automatic inventory management (see `db/08_automatic_inventory_features.sql`):

1. **Automatic Increment**: When donation is approved, blood is added to inventory
2. **Automatic Decrement**: When request is fulfilled, blood is deducted (FIFO)
3. **Automatic Expiration**: Blood units are marked expired when expiration date passes
4. **Batch Combination**: Same blood type/variety batches are combined
5. **Zero-Unit Cleanup**: Items with zero units are removed

### Donor Matching

When a blood request is created:
1. System finds eligible donors matching blood group
2. Filters by location (city)
3. Checks donation eligibility (56-day cooldown)
4. Matches compatible blood groups
5. Links matched donors to request

## 🛡️ Security Features

- **Password Hashing**: Uses bcryptjs (10 rounds)
- **JWT Tokens**: Secure token-based authentication
- **Input Validation**: express-validator for request validation
- **CORS**: Configured to allow only frontend origin
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **Error Handling**: Centralized error handling middleware

## 🔧 Development

### Available Scripts

```bash
# Start development server (with nodemon auto-reload)
npm run dev

# Start production server
npm start

# Run tests (if configured)
npm test
```

### Database Sync

In development mode, Sequelize can automatically sync models:
- Set `alter: true` in `src/config/database.js` for auto-updates
- **Warning**: Use migrations in production instead of auto-sync

### Environment Variables

Required environment variables (in `.env`):

```env
PORT=5000                    # Server port
NODE_ENV=development        # Environment (development/production)

DB_HOST=localhost           # MySQL host
DB_PORT=3306                # MySQL port
DB_NAME=blood_donation_db   # Database name
DB_USER=root                # MySQL username
DB_PASSWORD=your_password   # MySQL password

JWT_SECRET=your-secret-key  # JWT signing secret (use strong key in production)
JWT_EXPIRE=7d               # Token expiration (7 days)

FRONTEND_URL=http://localhost:3000  # Frontend URL for CORS
```

## 🐛 Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `mysql -u root -p`
- Check database credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`
- Check Sequelize connection in `src/config/database.js`

### Port Already in Use

- Change `PORT` in `.env`
- Or kill process using port 5000:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:5000 | xargs kill
  ```

### CORS Errors

- Verify `FRONTEND_URL` in `.env` matches frontend URL
- Check CORS configuration in `src/server.js`
- Ensure backend server is running

### Authentication Issues

- Verify `JWT_SECRET` is set in `.env`
- Check token expiration settings
- Ensure token is included in `Authorization` header
- Verify token format: `Bearer <token>`

### Sequelize Errors

- Check model associations in `src/models/index.js`
- Verify foreign key constraints in database
- Check Sequelize sync settings

## 📝 API Request/Response Examples

### Register User

**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "bloodGroup": "O+",
  "city": "New York",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "bloodGroup": "O+",
    "city": "New York"
  }
}
```

### Create Donation

**Request:**
```http
POST /api/donations
Content-Type: application/json
Authorization: Bearer <token>

{
  "bloodGroup": "O+",
  "city": "New York",
  "eventDate": "2024-12-25",
  "selectedOrganization": "City Blood Bank"
}
```

**Response:**
```json
{
  "success": true,
  "donation": {
    "id": 1,
    "bloodGroup": "O+",
    "status": "pending",
    "eventDate": "2024-12-25",
    "createdAt": "2024-12-01T10:00:00.000Z"
  }
}
```

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production` in `.env`
2. Use production database (not localhost)
3. Set strong `JWT_SECRET` (use crypto.randomBytes)
4. Update `FRONTEND_URL` to production URL
5. Use process manager (PM2, forever, etc.)
6. Enable HTTPS
7. Set up database backups
8. Configure logging
9. Use Sequelize migrations instead of auto-sync

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name blood-donation-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## 📚 Additional Documentation

- **Database**: See `db/README.md` for comprehensive database documentation
- **Frontend**: See `../frontend/README.md` for frontend documentation
- **Main Project**: See `../README.md` for overall project documentation

## 🔗 Related Files

- Database setup scripts: `db/03_complete_setup.sql`
- Environment template: `env.example`
- Package dependencies: `package.json`

---

**Last Updated**: 2024
**Version**: 1.0.0
