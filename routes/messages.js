const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/:roomId
// @desc    Get messages in a room
// @access  Private
router.get('/:roomId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ 
      roomId: req.params.roomId,
      isDeleted: false 
    })
      .populate('sender', 'fullName email')
      .populate('receiver', 'fullName email')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   POST /api/messages/send
// @desc    Send a message
// @access  Private
router.post('/send', protect, async (req, res) => {
  try {
    const { roomId, receiver, content, productId } = req.body;

    const newMessage = await Message.create({
      roomId,
      sender: req.user._id,
      receiver,
      content,
      relatedProduct: productId
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'fullName email')
      .populate('receiver', 'fullName email');

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Recall/delete a message
// @access  Private
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Only sender can recall their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể thu hồi tin nhắn của mình'
      });
    }

    // Check if message is within recall time limit (5 minutes)
    const timeDiff = Date.now() - message.createdAt.getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeDiff > fiveMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể thu hồi tin nhắn trong vòng 5 phút'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Đã thu hồi tin nhắn',
      messageId: message._id,
      roomId: message.roomId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

// @route   GET /api/messages/conversations/list
// @desc    Get all conversations for user
// @access  Private
router.get('/conversations/list', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get all messages involving this user
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ]
    }).sort({ createdAt: -1 });

    // Group by roomId and get latest message + other user info
    const roomMap = new Map();
    
    for (const msg of messages) {
      if (!roomMap.has(msg.roomId)) {
        // Determine the other user ID
        const otherUserId = msg.sender.toString() === req.user._id.toString() 
          ? msg.receiver 
          : msg.sender;
        
        // Get other user details
        const otherUser = await User.findById(otherUserId).select('fullName email');
        
        // Skip if user not found
        if (!otherUser) {
          console.log(`User ${otherUserId} not found for room ${msg.roomId}`);
          continue;
        }
        
        // Count unread messages
        const unreadCount = await Message.countDocuments({
          roomId: msg.roomId,
          receiver: req.user._id,
          isRead: false
        });
        
        roomMap.set(msg.roomId, {
          roomId: msg.roomId,
          otherUser: {
            _id: otherUser._id,
            fullName: otherUser.fullName,
            email: otherUser.email
          },
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: unreadCount
        });
      }
    }

    const conversations = Array.from(roomMap.values());

    res.json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
});

module.exports = router;
