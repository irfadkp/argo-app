const { Product } = require('../models');
const { Op } = require('sequelize');
const { logger, logBusinessEvent } = require('../utils/logger');

exports.getAllProducts = async (req, res) => {
  const { page = 1, limit = 20, category, search } = req.query;
  
  logger.info('Fetching products', {
    page,
    limit,
    category,
    search,
    userId: req.user?.id,
    ip: req.ip
  });

  try {
    const offset = (page - 1) * limit;

    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info('Products fetched successfully', {
      count,
      page,
      limit,
      category,
      search,
      resultCount: products.length
    });

    res.json({
      products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get products error', {
      page,
      limit,
      category,
      search,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;
  
  logger.info('Fetching product by ID', { productId: id, userId: req.user?.id });

  try {
    const product = await Product.findByPk(id);

    if (!product) {
      logger.warn('Product not found', { productId: id });
      return res.status(404).json({ error: 'Product not found' });
    }

    logger.debug('Product fetched successfully', {
      productId: id,
      productName: product.name
    });

    res.json({ product });
  } catch (error) {
    logger.error('Get product error', {
      productId: id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  logger.info('Fetching products by category', { category, page, limit });

  try {
    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      where: { category },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info('Products by category fetched', {
      category,
      count,
      page,
      resultCount: products.length
    });

    res.json({
      products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Get products by category error', {
      category,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.createProduct = async (req, res) => {
  const { name, description, price, stock_quantity, image_url, category } = req.body;
  
  logger.info('Creating new product', {
    name,
    category,
    price,
    stock_quantity,
    adminId: req.user?.id
  });

  try {
    const product = await Product.create({
      name,
      description,
      price,
      stock_quantity,
      image_url,
      category
    });

    logger.info('Product created successfully', {
      productId: product.id,
      name: product.name,
      category: product.category,
      adminId: req.user?.id
    });

    logBusinessEvent('PRODUCT_CREATED', {
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      adminId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ product });
  } catch (error) {
    logger.error('Create product error', {
      name,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  logger.info('Updating product', {
    productId: id,
    updates: Object.keys(updates),
    adminId: req.user?.id
  });

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      logger.warn('Product not found for update', { productId: id });
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldValues = { ...product.dataValues };
    await product.update(updates);
    
    logger.info('Product updated successfully', {
      productId: id,
      oldValues,
      newValues: product.dataValues,
      adminId: req.user?.id
    });

    logBusinessEvent('PRODUCT_UPDATED', {
      productId: id,
      changes: updates,
      adminId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({ product });
  } catch (error) {
    logger.error('Update product error', {
      productId: id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  
  logger.info('Deleting product', { productId: id, adminId: req.user?.id });

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      logger.warn('Product not found for deletion', { productId: id });
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = { ...product.dataValues };
    await product.destroy();
    
    logger.info('Product deleted successfully', {
      productId: id,
      productName: productData.name,
      adminId: req.user?.id
    });

    logBusinessEvent('PRODUCT_DELETED', {
      productId: id,
      productName: productData.name,
      adminId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error', {
      productId: id,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

exports.getCategories = async (req, res) => {
  logger.debug('Fetching product categories');

  try {
    const categories = await Product.findAll({
      attributes: ['category'],
      group: ['category'],
      where: {
        category: { [Op.ne]: null }
      }
    });

    const categoryList = categories.map(p => p.category).filter(Boolean);
    
    logger.info('Categories fetched successfully', {
      count: categoryList.length,
      categories: categoryList
    });

    res.json({ categories: categoryList });
  } catch (error) {
    logger.error('Get categories error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Made with Bob
