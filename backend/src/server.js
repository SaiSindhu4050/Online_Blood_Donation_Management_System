const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { connectDB, syncModels } = require('./config/database');

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
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/organizations', require('./routes/organization.routes'));
app.use('/api/donations', require('./routes/donation.routes'));
app.use('/api/requests', require('./routes/request.routes'));
app.use('/api/events', require('./routes/event.routes'));

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

