const { Order, OrderItem, CartItem, Product, User } = require('../models');
const sequelize = require('../config/database');
const { logger, logBusinessEvent } = require('../utils/logger');

exports.getOrders = async (req, res) => {
  logger.info('Fetching user orders', { userId: req.user.id });

  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    logger.info('Orders fetched successfully', {
      userId: req.user.id,
      orderCount: orders.length
    });

    res.json({ orders });
  } catch (error) {
    logger.error('Get orders error', {
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  
  logger.info('Fetching order by ID', { orderId: id, userId: req.user.id });

  try {
    const order = await Order.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url', 'price']
        }]
      }]
    });

    if (!order) {
      logger.warn('Order not found', { orderId: id, userId: req.user.id });
      return res.status(404).json({ error: 'Order not found' });
    }

    logger.debug('Order fetched successfully', {
      orderId: id,
      userId: req.user.id,
      status: order.status,
      totalAmount: order.total_amount
    });

    res.json({ order });
  } catch (error) {
    logger.error('Get order error', {
      orderId: id,
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.createOrder = async (req, res) => {
  const { shipping_address } = req.body;
  
  logger.info('Creating new order', {
    userId: req.user.id,
    userEmail: req.user.email,
    shippingAddress: shipping_address
  });

  const transaction = await sequelize.transaction();

  try {
    // Get cart items
    const cartItems = await CartItem.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: Product,
        as: 'product'
      }],
      transaction
    });

    if (cartItems.length === 0) {
      await transaction.rollback();
      logger.warn('Order creation failed - cart is empty', { userId: req.user.id });
      return res.status(400).json({ error: 'Cart is empty' });
    }

    logger.debug('Cart items retrieved for order', {
      userId: req.user.id,
      itemCount: cartItems.length,
      items: cartItems.map(item => ({
        productId: item.product_id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }))
    });

    // Check stock and calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.product.stock_quantity < item.quantity) {
        await transaction.rollback();
        logger.warn('Order creation failed - insufficient stock', {
          userId: req.user.id,
          productId: item.product_id,
          productName: item.product.name,
          requestedQuantity: item.quantity,
          availableStock: item.product.stock_quantity
        });
        return res.status(400).json({
          error: `Insufficient stock for ${item.product.name}`
        });
      }
      totalAmount += parseFloat(item.product.price) * item.quantity;
    }

    logger.debug('Order validation passed', {
      userId: req.user.id,
      totalAmount,
      itemCount: cartItems.length
    });

    // Create order
    const order = await Order.create({
      user_id: req.user.id,
      total_amount: totalAmount,
      shipping_address,
      status: 'pending'
    }, { transaction });

    logger.info('Order record created', {
      orderId: order.id,
      userId: req.user.id,
      totalAmount,
      status: order.status
    });

    // Create order items and update stock
    for (const item of cartItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.product.price
      }, { transaction });

      logger.debug('Order item created', {
        orderId: order.id,
        productId: item.product_id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      });

      // Update product stock
      const oldStock = item.product.stock_quantity;
      await item.product.update({
        stock_quantity: item.product.stock_quantity - item.quantity
      }, { transaction });

      logger.info('Product stock updated', {
        productId: item.product_id,
        productName: item.product.name,
        oldStock,
        newStock: item.product.stock_quantity - item.quantity,
        quantitySold: item.quantity
      });
    }

    // Clear cart
    await CartItem.destroy({
      where: { user_id: req.user.id },
      transaction
    });

    logger.debug('Cart cleared after order creation', { userId: req.user.id });

    await transaction.commit();

    logger.info('Order transaction committed successfully', {
      orderId: order.id,
      userId: req.user.id
    });

    // Fetch complete order with items
    const completeOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'image_url']
        }]
      }]
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      userId: req.user.id,
      userEmail: req.user.email,
      totalAmount,
      itemCount: cartItems.length,
      status: order.status
    });

    logBusinessEvent('ORDER_CREATED', {
      orderId: order.id,
      userId: req.user.id,
      userEmail: req.user.email,
      totalAmount,
      itemCount: cartItems.length,
      shippingAddress: shipping_address,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ order: completeOrder });
  } catch (error) {
    await transaction.rollback();
    logger.error('Create order error - transaction rolled back', {
      userId: req.user.id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  logger.info('Updating order status', {
    orderId: id,
    newStatus: status,
    adminId: req.user?.id
  });

  try {
    const order = await Order.findByPk(id);
    if (!order) {
      logger.warn('Order not found for status update', { orderId: id });
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    logger.info('Order status updated successfully', {
      orderId: id,
      oldStatus,
      newStatus: status,
      userId: order.user_id,
      adminId: req.user?.id
    });

    logBusinessEvent('ORDER_STATUS_UPDATED', {
      orderId: id,
      oldStatus,
      newStatus: status,
      userId: order.user_id,
      adminId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({ order });
  } catch (error) {
    logger.error('Update order status error', {
      orderId: id,
      status,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  
  logger.info('Fetching all orders (admin)', {
    page,
    limit,
    status,
    adminId: req.user?.id
  });

  try {
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info('All orders fetched successfully', {
      count,
      page,
      limit,
      status,
      resultCount: orders.length,
      adminId: req.user?.id
    });

    res.json({
      orders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get all orders error', {
      page,
      limit,
      status,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Made with Bob
