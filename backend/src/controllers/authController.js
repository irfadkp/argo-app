const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/app');
const { logger, logAuthAttempt, logBusinessEvent } = require('../utils/logger');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

exports.register = async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  logger.info('User registration attempt', {
    email,
    first_name,
    last_name,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn('Registration failed - email already exists', {
        email,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password_hash: password,
      first_name,
      last_name
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin
    });

    // Generate token
    const token = generateToken(user.id);

    logBusinessEvent('USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    logger.error('Registration error', {
      email,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  logger.info('Login attempt', {
    email,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  try {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logAuthAttempt(email, false, 'User not found', { ip: req.ip });
      logger.warn('Login failed - user not found', { email, ip: req.ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      logAuthAttempt(email, false, 'Invalid password', {
        ip: req.ip,
        userId: user.id
      });
      logger.warn('Login failed - invalid password', {
        email,
        userId: user.id,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    logAuthAttempt(email, true, null, {
      userId: user.id,
      ip: req.ip
    });
    
    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      is_admin: user.is_admin,
      ip: req.ip
    });

    logBusinessEvent('USER_LOGIN', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    logger.error('Login error', {
      email,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  logger.debug('Get current user info', {
    userId: req.user.id,
    email: req.user.email
  });

  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        is_admin: req.user.is_admin
      }
    });
  } catch (error) {
    logger.error('Get user info error', {
      userId: req.user?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

exports.logout = async (req, res) => {
  logger.info('User logout', {
    userId: req.user?.id,
    email: req.user?.email,
    ip: req.ip
  });

  try {
    // In a stateless JWT setup, logout is handled client-side
    // by removing the token. Here we just send a success response.
    
    logBusinessEvent('USER_LOGOUT', {
      userId: req.user?.id,
      email: req.user?.email,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', {
      userId: req.user?.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Made with Bob
