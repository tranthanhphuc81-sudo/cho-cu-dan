const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   GET /api/users/:userId
// @desc    Get user by ID
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('fullName email phone address rating');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   POST /api/users/verify
// @desc    Upload verification document
// @access  Private
router.post('/verify', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên giấy tờ xác minh'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { verificationDocument: req.file.path },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Tải lên giấy tờ thành công. Chúng tôi sẽ xác minh trong 24h.',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   GET /api/users/nearby
// @desc    Get nearby users (for sellers)
// @access  Private
router.get('/nearby', protect, async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 1000 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tọa độ'
      });
    }

    const users = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      _id: { $ne: req.user._id }
    }).limit(20);

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// ==========================
// Admin user management
// ==========================

// @route   GET /api/users
// @desc    Get all users (admin)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:userId/role
// @desc    Update a user's role (admin)
// @access  Private/Admin
router.put('/:userId/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['buyer', 'seller', 'both', 'admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    }

    const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, message: 'Cập nhật role thành công', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
});

// @route   PUT /api/users/:userId/verify
// @desc    Verify/unverify a user (admin)
// @access  Private/Admin
router.put('/:userId/verify', protect, authorize('admin'), async (req, res) => {
  try {
    const { verified } = req.body; // boolean expected

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: verified === true || verified === 'true' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, message: 'Cập nhật trạng thái xác minh thành công', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
});

// @route   DELETE /api/users/:userId
// @desc    Delete user (admin)
// @access  Private/Admin
router.delete('/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    await user.deleteOne();

    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
});

module.exports = router;
