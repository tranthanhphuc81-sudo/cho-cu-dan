require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cho-cu-dan')
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    console.log('💡 Hãy đảm bảo MongoDB đang chạy: mongod');
  });

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('👤 Người dùng kết nối:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Người dùng ${socket.id} tham gia phòng ${roomId}`);
  });
  
  socket.on('send-message', (data) => {
    socket.to(data.roomId).emit('receive-message', data);
  });
  
  socket.on('recall-message', (data) => {
    socket.to(data.roomId).emit('recall-message', data);
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Người dùng ngắt kết nối:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Đã có lỗi xảy ra!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

// Handle server errors (e.g., port already in use) to give clearer message and exit gracefully
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the process that is using it or set a different PORT environment variable.`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📱 Chợ Cư Dân - Mua nhanh, Bán gần, Tình thân gắn kết`);
  });
} else {
  console.log('Server running in test mode (listen suppressed)');
}

module.exports = { app, io, server };

module.exports = { app, io };
