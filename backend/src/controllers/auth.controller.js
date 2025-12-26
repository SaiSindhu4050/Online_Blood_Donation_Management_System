const { User, Organization } = require('../models');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      bloodGroup
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Calculate age
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age
    if (age < 18 || age > 65) {
      return res.status(400).json({ message: 'Age must be between 18 and 65' });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      dateOfBirth,
      age,
      gender,
      address,
      city,
      state,
      zipCode,
      bloodGroup
    });

    const token = generateToken(user.id, 'user');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        bloodGroup: user.bloodGroup
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    const token = generateToken(user.id, 'user');

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        bloodGroup: user.bloodGroup
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new organization
// @route   POST /api/auth/org/register
// @access  Public
exports.registerOrganization = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      address,
      city,
      state,
      zipCode,
      description,
      website
    } = req.body;

    // Check if organization already exists
    const orgExists = await Organization.findOne({ where: { email } });
    if (orgExists) {
      return res.status(400).json({ message: 'Organization already exists with this email' });
    }

    // Create organization
    const organization = await Organization.create({
      name,
      email,
      password,
      phone,
      address,
      city,
      state,
      zipCode,
      description,
      website
    });

    const token = generateToken(organization.id, 'organization');

    res.status(201).json({
      success: true,
      token,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login organization
// @route   POST /api/auth/org/login
// @access  Public
exports.loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const organization = await Organization.findOne({ 
      where: { email },
      attributes: { include: ['password'] }
    });

    if (!organization || !(await organization.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!organization.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    const token = generateToken(organization.id, 'organization');

    res.json({
      success: true,
      token,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user/organization
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    if (req.userType === 'user') {
      const user = await User.findByPk(req.user.id);
      res.json({ success: true, user, userType: 'user' });
    } else if (req.userType === 'organization') {
      const organization = await Organization.findByPk(req.user.id);
      res.json({ success: true, organization, userType: 'organization' });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
