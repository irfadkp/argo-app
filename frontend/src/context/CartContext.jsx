import { createContext, useContext, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api';
import api from '../services/api';
import logger from '../utils/logger';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    logger.info('CartProvider initializing', { isAuthenticated });
    
    if (isAuthenticated) {
      logger.info('User authenticated - fetching cart');
      fetchCart();
    } else {
      logger.info('User not authenticated - clearing cart');
      setCart({ items: [], total: 0, count: 0 });
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    logger.debug('Fetching cart');
    
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.CART);
      setCart(response.data);
      
      logger.info('Cart fetched successfully', {
        itemCount: response.data.count,
        total: response.data.total
      });
    } catch (error) {
      logger.error('Fetch cart error', {
        error: error.message,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    logger.info('Adding item to cart', { productId, quantity });
    
    try {
      await api.post(API_ENDPOINTS.CART_ITEMS, {
        product_id: productId,
        quantity
      });
      await fetchCart();
      
      logger.info('Item added to cart successfully', { productId, quantity });
      logger.logBusinessEvent('ITEM_ADDED_TO_CART', { productId, quantity });
      
      return { success: true };
    } catch (error) {
      logger.error('Add to cart failed', {
        productId,
        quantity,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to add to cart'
      };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    logger.info('Updating cart item', { itemId, quantity });
    
    try {
      await api.put(API_ENDPOINTS.CART_ITEM(itemId), { quantity });
      await fetchCart();
      
      logger.info('Cart item updated successfully', { itemId, quantity });
      logger.logUserAction('UPDATE_CART_ITEM', { itemId, quantity });
      
      return { success: true };
    } catch (error) {
      logger.error('Update cart item failed', {
        itemId,
        quantity,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update cart'
      };
    }
  };

  const removeFromCart = async (itemId) => {
    logger.info('Removing item from cart', { itemId });
    
    try {
      await api.delete(API_ENDPOINTS.CART_ITEM(itemId));
      await fetchCart();
      
      logger.info('Item removed from cart successfully', { itemId });
      logger.logBusinessEvent('ITEM_REMOVED_FROM_CART', { itemId });
      
      return { success: true };
    } catch (error) {
      logger.error('Remove from cart failed', {
        itemId,
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to remove from cart'
      };
    }
  };

  const clearCart = async () => {
    logger.info('Clearing cart');
    
    try {
      await api.delete(API_ENDPOINTS.CART);
      setCart({ items: [], total: 0, count: 0 });
      
      logger.info('Cart cleared successfully');
      logger.logBusinessEvent('CART_CLEARED');
      
      return { success: true };
    } catch (error) {
      logger.error('Clear cart failed', {
        error: error.response?.data?.error || error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to clear cart'
      };
    }
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Made with Bob
