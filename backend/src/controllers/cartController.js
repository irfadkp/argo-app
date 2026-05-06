const { CartItem, Product } = require('../models');
const { logger, logBusinessEvent } = require('../utils/logger');

exports.getCart = async (req, res) => {
  logger.debug('Fetching cart', { userId: req.user.id });

  try {
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'image_url', 'stock_quantity']
      }],
      order: [['created_at', 'DESC']]
    });

    // Calculate total
    const total = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.product.price) * item.quantity);
    }, 0);

    logger.info('Cart fetched successfully', {
      userId: req.user.id,
      itemCount: cartItems.length,
      total: total.toFixed(2)
    });

    res.json({
      items: cartItems,
      total: total.toFixed(2),
      count: cartItems.length
    });
  } catch (error) {
    logger.error('Get cart error', {
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

exports.addToCart = async (req, res) => {
  const { product_id, quantity } = req.body;
  
  logger.info('Adding item to cart', {
    userId: req.user.id,
    productId: product_id,
    quantity
  });

  try {
    // Check if product exists and has enough stock
    const product = await Product.findByPk(product_id);
    if (!product) {
      logger.warn('Product not found for cart', { productId: product_id, userId: req.user.id });
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock_quantity < quantity) {
      logger.warn('Insufficient stock for cart', {
        productId: product_id,
        productName: product.name,
        requestedQuantity: quantity,
        availableStock: product.stock_quantity,
        userId: req.user.id
      });
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    let cartItem = await CartItem.findOne({
      where: {
        user_id: req.user.id,
        product_id
      }
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock_quantity < newQuantity) {
        logger.warn('Insufficient stock for cart update', {
          productId: product_id,
          currentQuantity: cartItem.quantity,
          requestedAddition: quantity,
          newQuantity,
          availableStock: product.stock_quantity,
          userId: req.user.id
        });
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
      
      logger.info('Cart item quantity updated', {
        cartItemId: cartItem.id,
        productId: product_id,
        oldQuantity: cartItem.quantity - quantity,
        newQuantity: cartItem.quantity,
        userId: req.user.id
      });
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        user_id: req.user.id,
        product_id,
        quantity
      });
      
      logger.info('New item added to cart', {
        cartItemId: cartItem.id,
        productId: product_id,
        quantity,
        userId: req.user.id
      });
    }

    // Fetch with product details
    const cartItemWithProduct = await CartItem.findByPk(cartItem.id, {
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'image_url', 'stock_quantity']
      }]
    });

    logBusinessEvent('ITEM_ADDED_TO_CART', {
      userId: req.user.id,
      productId: product_id,
      productName: product.name,
      quantity,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ item: cartItemWithProduct });
  } catch (error) {
    logger.error('Add to cart error', {
      userId: req.user.id,
      productId: product_id,
      quantity,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  logger.info('Updating cart item', {
    cartItemId: id,
    newQuantity: quantity,
    userId: req.user.id
  });

  try {
    const cartItem = await CartItem.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    if (!cartItem) {
      logger.warn('Cart item not found for update', { cartItemId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    if (cartItem.product.stock_quantity < quantity) {
      logger.warn('Insufficient stock for cart item update', {
        cartItemId: id,
        productId: cartItem.product_id,
        requestedQuantity: quantity,
        availableStock: cartItem.product.stock_quantity,
        userId: req.user.id
      });
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const oldQuantity = cartItem.quantity;
    cartItem.quantity = quantity;
    await cartItem.save();

    logger.info('Cart item updated successfully', {
      cartItemId: id,
      productId: cartItem.product_id,
      oldQuantity,
      newQuantity: quantity,
      userId: req.user.id
    });

    res.json({ item: cartItem });
  } catch (error) {
    logger.error('Update cart item error', {
      cartItemId: id,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

exports.removeFromCart = async (req, res) => {
  const { id } = req.params;
  
  logger.info('Removing item from cart', { cartItemId: id, userId: req.user.id });

  try {
    const cartItem = await CartItem.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!cartItem) {
      logger.warn('Cart item not found for removal', { cartItemId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const productId = cartItem.product_id;
    await cartItem.destroy();
    
    logger.info('Item removed from cart successfully', {
      cartItemId: id,
      productId,
      userId: req.user.id
    });

    logBusinessEvent('ITEM_REMOVED_FROM_CART', {
      userId: req.user.id,
      cartItemId: id,
      productId,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    logger.error('Remove from cart error', {
      cartItemId: id,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

exports.clearCart = async (req, res) => {
  logger.info('Clearing cart', { userId: req.user.id });

  try {
    const deletedCount = await CartItem.destroy({
      where: { user_id: req.user.id }
    });

    logger.info('Cart cleared successfully', {
      userId: req.user.id,
      itemsRemoved: deletedCount
    });

    logBusinessEvent('CART_CLEARED', {
      userId: req.user.id,
      itemsRemoved: deletedCount,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    logger.error('Clear cart error', {
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

// Made with Bob
