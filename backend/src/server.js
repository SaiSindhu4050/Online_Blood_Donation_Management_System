const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { connectDB, syncModels } = require('./config/database');
const { startEventScheduler } = require('./utils/eventScheduler');
const { startPreScreeningReminderScheduler } = require('./utils/preScreeningReminder');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Database Connection
connectDB().then(() => {
  // Sync models after connection is established
  syncModels();
  // Start event scheduler for automatic status updates and reminders
  startEventScheduler();
  // Start pre-screening reminder scheduler
  startPreScreeningReminderScheduler();
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/organizations', require('./routes/organization.routes'));
app.use('/api/donations', require('./routes/donation.routes'));
app.use('/api/requests', require('./routes/request.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/testimonials', require('./routes/testimonial.routes'));
app.use('/api/admin/auth', require('./routes/adminAuth.routes'));
app.use('/api/admin/dashboard', require('./routes/adminDashboard.routes'));
app.use('/api', require('./routes/eventWaitlist.routes'));
app.use('/api', require('./routes/eventCheckin.routes'));
app.use('/api', require('./routes/eventCancellation.routes'));
app.use('/api', require('./routes/preScreening.routes'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error Handling Middleware
app.use(require('./middleware/errorHandler.middleware'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

