# Blood Donation Management System

A comprehensive full-stack web application for managing blood donations, requests, and events. The system connects donors with recipients and enables organizations to manage donation drives and inventory.

## 🎯 Project Overview

This is a complete blood donation management platform that facilitates:
- **Donors** to register donations and find urgent blood requests
- **Recipients** to post blood requests and find matching donors
- **Organizations** to manage donation events, approve donations, and track inventory
- **Automatic matching** between donors and requests based on blood group and location
- **Inventory management** with automatic expiration tracking and FIFO distribution

## 🚀 Features

### User Features
- User registration and authentication
- Donation registration with 56-day cooldown validation
- Blood request creation and donor matching
- Personal dashboard with donation history and statistics
- View urgent requests in your area
- Track donation eligibility and appointments

### Organization Features
- Organization registration and authentication
- Approve/deny donation requests
- Manage blood inventory with automatic tracking
- Create and manage donation events
- View event registrations
- Dashboard with comprehensive analytics
- Automatic inventory management (increment on approval, decrement on fulfillment)

### System Features
- **Automatic Donor Matching**: Finds eligible donors based on blood group, location, and donation eligibility
- **Inventory Management**: Tracks blood units with expiration dates, automatic expiration marking, and FIFO distribution
- **Event Management**: Organizations can create donation events and track registrations
- **Request Rescheduling**: Support for rescheduling donation appointments
- **Peer-to-Peer Matching**: Donations can be linked to specific requests for direct matching

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.0 - UI framework
- **React Router DOM** 7.9.5 - Routing
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** 4.18.2 - Web framework
- **MySQL** - Database
- **Sequelize** 6.35.2 - ORM
- **JWT** (jsonwebtoken) - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **express-validator** - Input validation
- **morgan** - HTTP request logger

### Database
- **MySQL** - Relational database
- **Stored Procedures** - For automatic inventory management
- **Triggers** - For automatic expiration tracking
- **Events** - Scheduled tasks for daily expiration checks

## 📁 Project Structure

```
myapp/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable components (Navbar)
│   │   ├── pages/           # Page components
│   │   │   ├── Home/        # Landing/home page
│   │   │   ├── Donate/      # Donation form
│   │   │   ├── Request/     # Blood request form
│   │   │   ├── Login/       # User login
│   │   │   ├── Signup/      # User registration
│   │   │   ├── UserDashboard/      # User dashboard
│   │   │   ├── OrganizationLogin/  # Org login
│   │   │   ├── OrganizationSignup/ # Org registration
│   │   │   └── OrganizationDashboard/ # Org dashboard
│   │   ├── utils/           # Utility functions (API, storage)
│   │   └── App.js           # Main app component with routing
│   ├── package.json
│   └── README.md
│
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Route controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── organization.controller.js
│   │   │   ├── donation.controller.js
│   │   │   ├── request.controller.js
│   │   │   └── event.controller.js
│   │   ├── middleware/      # Custom middleware (auth, error handling)
│   │   ├── models/          # Sequelize models
│   │   │   ├── User.model.js
│   │   │   ├── Organization.model.js
│   │   │   ├── Donation.model.js
│   │   │   ├── Request.model.js
│   │   │   ├── Event.model.js
│   │   │   ├── BloodInventory.model.js
│   │   │   ├── DonationRescheduleRequest.model.js
│   │   │   └── Notification.model.js
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions (JWT generation)
│   │   └── server.js        # Entry point
│   ├── db/                  # Database scripts
│   │   ├── 01_create_database.sql
│   │   ├── 02_create_tables.sql
│   │   ├── 03_complete_setup.sql ⭐ (Recommended for initial setup)
│   │   ├── 04_donation_queries.sql
│   │   ├── 05_request_queries.sql
│   │   ├── 06_user_dashboard_queries.sql
│   │   ├── 07_organization_dashboard_queries.sql
│   │   ├── 08_automatic_inventory_features.sql
│   │   ├── 09_add_requestid_to_donations.sql
│   │   ├── 10_initialize_inventory_for_all_orgs.sql
│   │   ├── 11_create_reschedule_requests_table.sql
│   │   └── README.md        # Detailed database documentation
│   ├── env.example          # Environment variables template
│   ├── package.json
│   └── README.md
│
└── README.md                # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MySQL** (v8.0 or higher)
- **Git** (optional, for version control)

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd myapp
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory (copy from `env.example`):

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

#### Database Setup

**Option 1: Complete Setup (Recommended)**
```bash
mysql -u root -p < db/03_complete_setup.sql
```

**Option 2: Step by Step**
```bash
# Create database
mysql -u root -p < db/01_create_database.sql

# Create tables
mysql -u root -p < db/02_create_tables.sql

# Add automatic inventory features
mysql -u root -p < db/08_automatic_inventory_features.sql

# Add requestId to donations (for peer-to-peer matching)
mysql -u root -p < db/09_add_requestid_to_donations.sql

# Initialize inventory for organizations
mysql -u root -p < db/10_initialize_inventory_for_all_orgs.sql

# Create reschedule requests table
mysql -u root -p < db/11_create_reschedule_requests_table.sql
```

**Using MySQL Workbench:**
1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Open SQL Script
4. Select `03_complete_setup.sql`
5. Execute the script (⚡ button or `Ctrl+Shift+Enter`)

#### Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

#### Start Frontend Development Server

```bash
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## 🗄️ Database Schema

### Core Tables

1. **users** - User accounts (donors)
   - Stores user information, blood group, donation history
   - Fields: id, name, email, password, bloodGroup, city, phone, etc.

2. **organizations** - Organization accounts
   - Stores organization information
   - Fields: id, name, email, password, city, address, phone, etc.

3. **donations** - Blood donation registrations
   - Links users to events and requests
   - Fields: id, userId, eventId, requestId, bloodGroup, status, eventDate, etc.

4. **requests** - Blood requests from patients/hospitals
   - Can be linked to users
   - Fields: id, userId, bloodGroup, units, urgency, city, requiredDate, status, etc.

5. **events** - Blood donation events
   - Created by organizations
   - Fields: id, organizationId, title, description, eventDate, location, status, etc.

6. **RequestDonors** - Many-to-many relationship
   - Links requests to matched donors
   - Fields: requestId, userId, status, matchedAt

7. **blood_inventory** - Blood inventory tracking
   - Tracks blood units by organization
   - Fields: id, organizationId, donationId, bloodGroup, donationType, units, expirationDate, status

8. **DonationRescheduleRequest** - Rescheduling requests
   - Fields: id, donationId, requestedDate, reason, status

9. **notifications** - User notifications
   - Fields: id, userId, organizationId, type, message, isRead

## 🔌 API Endpoints

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

### Health Check
- `GET /api/health` - Server health check

## 🔐 Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

Tokens are returned upon successful login and expire after 7 days (configurable via `JWT_EXPIRE`).

## 🎨 Frontend Routes

- `/` - Home page
- `/donate` - Donation form
- `/request` - Blood request form
- `/login` - User login
- `/signup` - User registration
- `/dashboard` - User dashboard
- `/org-login` - Organization login
- `/org-signup` - Organization registration
- `/org-dashboard` - Organization dashboard

## ⚙️ Key Features Explained

### Automatic Inventory Management

The system includes automatic inventory management features:

1. **Automatic Increment**: When a donation is approved, blood units are automatically added to the organization's inventory
2. **Automatic Decrement**: When a request is fulfilled, blood units are automatically deducted from inventory (FIFO - First In First Out)
3. **Automatic Expiration**: Blood units are automatically marked as expired when the expiration date passes
4. **Batch Combination**: Same blood type and variety batches are automatically combined
5. **Zero-Unit Cleanup**: Inventory items with zero units are automatically removed

These features are implemented using MySQL stored procedures, triggers, and scheduled events (see `backend/db/08_automatic_inventory_features.sql`).

### Donor Matching

When a blood request is created, the system automatically:
1. Finds eligible donors matching the blood group
2. Filters by location (city)
3. Checks donation eligibility (56-day cooldown)
4. Matches compatible blood groups (e.g., O- can donate to all, AB+ can receive from all)
5. Links matched donors to the request

### 56-Day Cooldown

Users must wait 56 days between donations. The system:
- Validates eligibility before allowing donation registration
- Tracks last donation date
- Prevents multiple donations within the cooldown period

## 🧪 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

**Frontend:**
```bash
cd frontend
npm start  # React development server with hot reload
```

### Database Sync

In development mode, Sequelize will automatically sync models to the database. For production, use migrations instead of auto-sync.

## 📝 Database Migrations

The project includes several migration scripts in `backend/db/`:

- `09_add_requestid_to_donations.sql` - Adds requestId column to donations for peer-to-peer matching
- `10_initialize_inventory_for_all_orgs.sql` - Initializes inventory for existing organizations
- `11_create_reschedule_requests_table.sql` - Creates reschedule requests table

Run migrations in order as needed.

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running: `mysql -u root -p`
- Check database credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
- Backend: Change `PORT` in `.env` (default: 5000)
- Frontend: React will prompt to use a different port (default: 3000)

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check that backend server is running

### Authentication Issues
- Verify JWT_SECRET is set in `.env`
- Check token expiration settings
- Ensure token is included in Authorization header

## 📚 Additional Documentation

- **Backend API**: See `backend/README.md` for detailed API documentation
- **Database**: See `backend/db/README.md` for comprehensive database documentation
- **Frontend**: See `frontend/README.md` for React app details

## 🚀 Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in `.env`
2. Use a production database (not localhost)
3. Set strong `JWT_SECRET`
4. Use process manager (PM2, forever, etc.)
5. Enable HTTPS

### Frontend Deployment
1. Build for production: `npm run build`
2. Deploy `build/` folder to static hosting (Netlify, Vercel, etc.)
3. Update `FRONTEND_URL` in backend `.env` to production URL

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. For contributions, please contact the project maintainer.

## 📞 Support

For issues or questions, please contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0.0
