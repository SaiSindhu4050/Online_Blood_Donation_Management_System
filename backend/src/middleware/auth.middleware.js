const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Use the type from token if available (new tokens), otherwise check both tables (backward compatibility)
      const tokenType = decoded.type;
      console.log('Token decoded:', { id: decoded.id, type: tokenType, hasType: !!tokenType });

      if (tokenType === 'organization') {
        // Token explicitly says it's an organization
        console.log('Token type is organization, looking up organization ID:', decoded.id);
        const organization = await Organization.findByPk(decoded.id);
        if (organization && organization.isActive) {
          req.user = organization;
          req.userType = 'organization';
          console.log('Successfully authenticated as organization:', organization.id, organization.name);
          return next();
        }
        if (organization && !organization.isActive) {
          console.error('Organization found but inactive:', decoded.id);
          return res.status(401).json({ message: 'Organization account is inactive' });
        }
        console.error('Organization not found for ID:', decoded.id);
        return res.status(401).json({ message: 'Organization not found' });
      } else if (tokenType === 'user') {
        // Token explicitly says it's a user
        const user = await User.findByPk(decoded.id);
        if (user && user.isActive) {
          req.user = user;
          req.userType = 'user';
          return next();
        }
        if (user && !user.isActive) {
          return res.status(401).json({ message: 'User account is inactive' });
        }
        return res.status(401).json({ message: 'User not found' });
      } else {
        // Backward compatibility: no type in token, check both tables
        // This handles old tokens that don't have the type field
        console.log('Token has no type field, checking both tables for ID:', decoded.id);
        const [user, organization] = await Promise.all([
          User.findByPk(decoded.id),
          Organization.findByPk(decoded.id)
        ]);

        console.log('Backward compatibility check:', {
          userId: decoded.id,
          foundUser: !!user,
          foundOrganization: !!organization,
          userActive: user?.isActive,
          orgActive: organization?.isActive
        });

        // Check organization first (since we're likely on an organization route if this fails)
        if (organization) {
          if (organization.isActive) {
            req.user = organization;
            req.userType = 'organization';
            console.log('Set userType to organization for ID:', decoded.id);
            return next();
          } else {
            return res.status(401).json({ message: 'Organization account is inactive' });
          }
        }

        // Then check user
        if (user) {
          if (user.isActive) {
            req.user = user;
            req.userType = 'user';
            console.log('Set userType to user for ID:', decoded.id);
            return next();
          } else {
            return res.status(401).json({ message: 'User account is inactive' });
          }
        }

        // Neither found
        console.error('Neither user nor organization found for ID:', decoded.id);
        return res.status(401).json({ message: 'User or organization not found' });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check if user is a regular user
exports.isUser = (req, res, next) => {
  if (req.userType !== 'user') {
    return res.status(403).json({ message: 'Access denied. User access required.' });
  }
  next();
};

// Check if user is an organization
exports.isOrganization = (req, res, next) => {
  if (req.userType !== 'organization') {
    console.error('Organization access denied:', {
      userType: req.userType,
      userId: req.user?.id,
      hasUser: !!req.user
    });
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Organization access required.',
      debug: process.env.NODE_ENV === 'development' ? {
        userType: req.userType,
        userId: req.user?.id
      } : undefined
    });
  }
  next();
};

// Optional auth - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const user = await User.findByPk(decoded.id);
        if (user && user.isActive) {
          req.user = user;
          req.userType = 'user';
          return next();
        }

        const organization = await Organization.findByPk(decoded.id);
        if (organization && organization.isActive) {
          req.user = organization;
          req.userType = 'organization';
          return next();
        }
      } catch (error) {
        // Token invalid, continue without auth
      }
    }
    next();
  } catch (error) {
    next();
  }
};
