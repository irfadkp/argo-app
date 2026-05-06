import { createContext, useContext, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import api from '../services/api';
import logger from '../utils/logger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.info('AuthProvider initializing');
    
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        logger.info('User restored from localStorage', {
          userId: parsedUser.id,
          email: parsedUser.email,
          isAdmin: parsedUser.is_admin
        });
      } catch (error) {
        logger.error('Failed to parse saved user', { error: error.message });
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      logger.info('No saved user found in localStorage');
    }
    
    setLoading(false);
    logger.info('AuthProvider initialized');
  }, []);

  const login = async (email, password) => {
    logger.info('Login attempt', { email });
    
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, { email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      logger.info('Login successful', {
        userId: user.id,
        email: user.email,
        isAdmin: user.is_admin
      });

      logger.logBusinessEvent('USER_LOGIN', {
        userId: user.id,
        email: user.email
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Login failed', {
        email,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    logger.info('Registration attempt', {
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name
    });
    
    try {
      const response = await api.post(API_ENDPOINTS.REGISTER, userData);
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      logger.info('Registration successful', {
        userId: user.id,
        email: user.email
      });

      logger.logBusinessEvent('USER_REGISTERED', {
        userId: user.id,
        email: user.email
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Registration failed', {
        email: userData.email,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    const userId = user?.id;
    const userEmail = user?.email;
    
    logger.info('Logout initiated', { userId, email: userEmail });
    
    try {
      await api.post(API_ENDPOINTS.LOGOUT);
      logger.info('Logout API call successful');
    } catch (error) {
      logger.error('Logout API call failed', {
        error: error.message,
        userId,
        email: userEmail
      });
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      logger.info('User logged out', { userId, email: userEmail });
      
      logger.logBusinessEvent('USER_LOGOUT', {
        userId,
        email: userEmail
      });
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Made with Bob
