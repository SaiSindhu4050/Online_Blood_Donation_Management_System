# Frontend - Blood Donation Management System

React-based frontend application for the Blood Donation Management System. This is a single-page application (SPA) built with React Router for navigation and modern React patterns.

## 🎯 Overview

The frontend provides a user-friendly interface for:
- **Donors** to register donations, view requests, and manage their profile
- **Recipients** to post blood requests and find donors
- **Organizations** to manage donations, requests, events, and inventory

## 🛠️ Tech Stack

- **React** 19.2.0 - UI library
- **React Router DOM** 7.9.5 - Client-side routing
- **CSS3** - Styling (component-scoped CSS files)
- **Fetch API** - HTTP requests to backend
- **localStorage** - Client-side storage for authentication tokens

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── components/         # Reusable components
│   │   └── Navbar/         # Navigation bar component
│   │       ├── Navbar.jsx
│   │       └── Navbar.css
│   │
│   ├── pages/             # Page components
│   │   ├── Home/           # Landing/home page
│   │   ├── Landing/        # Alternative landing page
│   │   ├── Donate/         # Donation form
│   │   ├── Request/        # Blood request form
│   │   ├── Login/          # User login page
│   │   ├── Signup/          # User registration page
│   │   ├── UserDashboard/  # User dashboard
│   │   ├── OrganizationLogin/      # Organization login
│   │   ├── OrganizationSignup/    # Organization registration
│   │   └── OrganizationDashboard/ # Organization dashboard
│   │
│   ├── utils/              # Utility functions
│   │   ├── api.js          # API client functions
│   │   └── storage.js      # localStorage helpers
│   │
│   ├── App.js              # Main app component with routing
│   ├── App.css             # Global app styles
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
│
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Backend server running (see `../backend/README.md`)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure API endpoint (optional):
   - The default API URL is `http://localhost:5000/api`
   - To change it, create a `.env` file in the `frontend` directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

## 📱 Available Routes

| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/` | Home | Landing page with features and CTA | No |
| `/donate` | Donate | Donation registration form | Optional |
| `/request` | Request | Blood request form | Optional |
| `/login` | Login | User login page | No |
| `/signup` | Signup | User registration page | No |
| `/dashboard` | UserDashboard | User dashboard with stats and history | Yes (User) |
| `/org-login` | OrganizationLogin | Organization login page | No |
| `/org-signup` | OrganizationSignup | Organization registration page | No |
| `/org-dashboard` | OrganizationDashboard | Organization dashboard | Yes (Org) |

## 🔑 Authentication

The frontend uses JWT tokens stored in `localStorage` for authentication:

- **User tokens**: Stored under `bl_current_user_v1`
- **Organization tokens**: Stored under `bl_current_org_v1`

The API client (`utils/api.js`) automatically includes the appropriate token in request headers.

### Authentication Flow

1. User/Organization logs in via `/login` or `/org-login`
2. Backend returns JWT token
3. Token is stored in `localStorage` with user/org data
4. Subsequent API requests include token in `Authorization: Bearer <token>` header
5. On logout, token is removed from `localStorage`

## 📡 API Integration

The frontend communicates with the backend through the API client in `src/utils/api.js`. All API functions are organized by resource:

### Available API Modules

- **authAPI** - Authentication (register, login, get current user)
- **userAPI** - User profile and dashboard
- **organizationAPI** - Organization profile, dashboard, inventory
- **donationAPI** - Donation CRUD operations
- **requestAPI** - Blood request CRUD operations
- **eventAPI** - Event management

### Example Usage

```javascript
import { donationAPI } from '../utils/api';

// Create a donation
const donation = await donationAPI.createDonation({
  bloodGroup: 'O+',
  city: 'New York',
  eventDate: '2024-12-25',
  // ... other fields
});

// Get user dashboard
const dashboard = await userAPI.getDashboard();
```

## 🎨 Component Structure

### Pages

Each page is a self-contained component with its own CSS file:

- **Home.jsx** - Landing page with hero section, features, and call-to-action
- **Donate.jsx** - Donation form with validation and 56-day cooldown check
- **Request.jsx** - Blood request form with donor matching
- **UserDashboard.jsx** - User dashboard showing:
  - Donation history and statistics
  - Blood requests
  - Upcoming appointments
  - Urgent requests in area
- **OrganizationDashboard.jsx** - Organization dashboard showing:
  - Pending donations for approval
  - Blood requests
  - Event management
  - Inventory tracking
  - Analytics

### Shared Components

- **Navbar** - Navigation bar with conditional rendering based on auth state

## 💾 Client-Side Storage

The app uses `localStorage` for:
- Authentication tokens and user/org data
- Caching (optional, for offline support)

**Note**: Sensitive data should not be stored in `localStorage` in production. The current implementation stores JWT tokens, which is acceptable for this use case.

## 🎯 Key Features

### Donation Management

- **56-Day Cooldown Validation**: Prevents users from donating too frequently
- **Event Linking**: Donations can be linked to organization events
- **Request Linking**: Donations can be linked to specific blood requests (peer-to-peer matching)
- **Status Tracking**: Track donation status (pending, approved, completed, cancelled)

### Request Management

- **Automatic Donor Matching**: System finds eligible donors based on:
  - Blood group compatibility
  - Location (city)
  - Donation eligibility (56-day cooldown)
- **Urgency Levels**: Emergency, urgent, and normal requests
- **Status Tracking**: Track request status (pending, matched, fulfilled)

### Organization Features

- **Donation Approval**: Review and approve/deny pending donations
- **Inventory Management**: Track blood inventory with expiration dates
- **Event Management**: Create and manage donation events
- **Reschedule Requests**: Handle donation reschedule requests from users

## 🔧 Development

### Available Scripts

```bash
# Start development server (with hot reload)
npm start

# Build for production
npm run build

# Run tests
npm test

# Eject from Create React App (one-way operation)
npm run eject
```

### Development Tips

1. **Hot Reload**: Changes to components automatically reload in the browser
2. **API Errors**: Check browser console and network tab for API errors
3. **Authentication**: Clear `localStorage` if experiencing auth issues:
   ```javascript
   localStorage.clear();
   ```

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Note**: Environment variables must be prefixed with `REACT_APP_` to be accessible in the React app.

## 🐛 Troubleshooting

### CORS Errors

- Ensure backend CORS is configured to allow `http://localhost:3000`
- Check `FRONTEND_URL` in backend `.env` file

### API Connection Issues

- Verify backend server is running on port 5000
- Check `REACT_APP_API_URL` in frontend `.env`
- Check browser console for network errors

### Authentication Issues

- Clear `localStorage` and log in again
- Verify JWT token is being stored correctly
- Check token expiration (default: 7 days)

### Build Errors

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`

## 📦 Building for Production

1. Build the production bundle:
```bash
npm run build
```

2. The `build/` folder contains optimized production files

3. Deploy the `build/` folder to a static hosting service:
   - **Netlify**: Drag and drop the `build` folder
   - **Vercel**: Connect your repo and set build command to `npm run build`
   - **AWS S3**: Upload `build/` contents to an S3 bucket
   - **Nginx**: Serve `build/` as static files

4. Update backend `FRONTEND_URL` to production URL

## 🎨 Styling

Each component has its own CSS file for scoped styling:
- Component-specific styles in `ComponentName.css`
- Global styles in `App.css` and `index.css`

The app uses a modern, responsive design with:
- Mobile-first approach
- Clean, professional UI
- Accessible color contrasts
- Smooth transitions and animations

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/)
- [React Router Documentation](https://reactrouter.com/)
- [Create React App Documentation](https://create-react-app.dev/)

## 🔗 Related Documentation

- **Backend API**: See `../backend/README.md`
- **Database**: See `../backend/db/README.md`
- **Main Project**: See `../README.md`

---

**Last Updated**: 2024
**Version**: 1.0.0
