const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/app');
const { logger } = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Authentication failed - no token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      logger.warn('Authentication failed - user not found', {
        userId: decoded.id,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(401).json({ error: 'User not found' });
    }

    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      path: req.path,
      method: req.method
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.warn('Authentication failed - invalid token', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (!req.user.is_admin) {
      logger.warn('Admin access denied - user is not admin', {
        userId: req.user.id,
        email: req.user.email,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    logger.debug('Admin authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path,
      method: req.method
    });
    
    next();
  } catch (error) {
    logger.error('Admin authentication error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { auth, adminAuth };

// Made with Bob
