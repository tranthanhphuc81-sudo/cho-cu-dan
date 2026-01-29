const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      productId,
      quantity,
      deliveryMethod,
      paymentMethod,
      notes,
      scheduledTime
    } = req.body;

    console.log('Creating order - Request body:', req.body);
    console.log('User:', req.user._id);

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    if (!product.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm hiện không có sẵn'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Chỉ còn ${product.stock} sản phẩm`
      });
    }

    // Calculate prices
    const totalPrice = product.price * quantity;
    let deliveryFee = 0;
    let discount = 0;

    if (deliveryMethod === 'Giao tận nơi') {
      deliveryFee = product.deliveryFee || 0;
    } else if (deliveryMethod === 'Tự đến lấy') {
      discount = product.pickupDiscount || 0;
    }

    const finalPrice = totalPrice + deliveryFee - discount;

    // Generate order number
    const count = await Order.countDocuments();
    const orderNumber = `CHO${Date.now().toString().slice(-8)}${(count + 1).toString().padStart(4, '0')}`;

    const order = await Order.create({
      orderNumber,
      buyer: req.user._id,
      seller: product.seller,
      product: productId,
      productSnapshot: {
        title: product.title,
        price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : null
      },
      quantity,
      totalPrice,
      deliveryMethod,
      deliveryFee,
      discount,
      finalPrice,
      paymentMethod,
      notes,
      deliveryAddress: req.user.address || {},
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined
    });

    // Update product stock
    product.stock -= quantity;
    if (product.stock === 0) {
      product.isAvailable = false;
    }
    await product.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name phone address')
      .populate('seller', 'name phone address')
      .populate('product', 'title images');

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message,
      error: error.message
    });
  }
});

// @route   GET /api/orders
// @desc    Get user orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type = 'buyer', status } = req.query;

    let query = {};
    if (type === 'buyer') {
      query.buyer = req.user._id;
    } else if (type === 'seller') {
      query.seller = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('buyer', 'name phone address')
      .populate('seller', 'name phone address')
      .populate('product', 'title images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   GET /api/orders/all
// @desc    Get all orders (admin)
// @access  Private/Admin
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'name phone address')
      .populate('seller', 'name phone address')
      .populate('product', 'title images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name phone address')
      .populate('seller', 'name phone address')
      .populate('product', 'title images description');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Check if user is buyer or seller
    if (order.buyer._id.toString() !== req.user._id.toString() && 
        order.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Only seller can update status
    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người bán mới có thể cập nhật trạng thái'
      });
    }

    order.status = status;
    if (status === 'Đã hoàn thành') {
      order.completedAt = Date.now();
      // Update product sold count
      await Product.findByIdAndUpdate(order.product, {
        $inc: { soldCount: order.quantity }
      });
    }
    await order.save();

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Check if user is buyer
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này'
      });
    }

    if (!['Chờ xác nhận', 'Đã xác nhận'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy đơn hàng ở trạng thái này'
      });
    }

    order.status = 'Đã hủy';
    order.cancelledAt = Date.now();
    order.cancelReason = reason;
    await order.save();

    // Restore product stock
    await Product.findByIdAndUpdate(order.product, {
      $inc: { stock: order.quantity },
      isAvailable: true
    });

    res.json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

module.exports = router;
