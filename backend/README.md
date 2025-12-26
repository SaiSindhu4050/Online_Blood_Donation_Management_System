# Backend API - Blood Donation Management System

Express.js backend API for the Blood Donation Management System using MySQL and Sequelize.

## Features

- User authentication (register/login)
- Organization authentication (register/login)
- Blood donation management
- Blood request management
- Event management
- Dashboard APIs for users and organizations

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **Sequelize** - ORM for MySQL
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── .env                 # Environment variables (create from env.example)
├── package.json
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory (copy from `env.example`):
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

3. Create the MySQL database:
```sql
CREATE DATABASE blood_donation_db;
```

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will automatically create tables on first run (in development mode).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/org/register` - Register a new organization
- `POST /api/auth/org/login` - Login organization
- `GET /api/auth/me` - Get current user/organization (Protected)

### Users
- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update user profile (Protected)
- `GET /api/users/dashboard` - Get user dashboard data (Protected)

### Organizations
- `GET /api/organizations` - Get all organizations (Public)
- `GET /api/organizations/profile` - Get organization profile (Protected)
- `PUT /api/organizations/profile` - Update organization profile (Protected)
- `GET /api/organizations/dashboard` - Get organization dashboard (Protected)

### Donations
- `POST /api/donations` - Create a new donation (Public/Optional Auth)
- `GET /api/donations` - Get all donations (Protected)
- `GET /api/donations/:id` - Get single donation (Protected)
- `PUT /api/donations/:id/status` - Update donation status (Organization)
- `DELETE /api/donations/:id` - Delete donation (Protected)

### Requests
- `POST /api/requests` - Create a new blood request (Public/Optional Auth)
- `GET /api/requests` - Get all requests (Public)
- `GET /api/requests/:id` - Get single request (Public)
- `POST /api/requests/:id/match` - Match donors to request (Public)
- `PUT /api/requests/:id/status` - Update request status (Protected)
- `DELETE /api/requests/:id` - Delete request (Protected)

### Events
- `POST /api/events` - Create a new event (Organization)
- `GET /api/events` - Get all events (Public)
- `GET /api/events/:id` - Get single event (Public)
- `PUT /api/events/:id` - Update event (Organization)
- `DELETE /api/events/:id` - Delete event (Organization)
- `GET /api/events/:id/registrations` - Get event registrations (Organization)

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Database Models

- **User** - Regular users who can donate blood
- **Organization** - Organizations that manage events
- **Donation** - Blood donation registrations
- **Request** - Blood requests from patients/hospitals
- **Event** - Donation events organized by organizations

## Development

The server runs on port 5000 by default. Make sure your frontend is configured to connect to `http://localhost:5000`.

### Database Sync

In development mode, Sequelize will automatically sync models to the database. Set `alter: true` in `src/config/database.js` if you want tables to be updated automatically when models change.

For production, use Sequelize migrations instead of auto-sync.
