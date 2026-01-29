const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: false // Will be set in pre-save hook
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productSnapshot: {
    title: String,
    price: Number,
    image: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true
  },
  deliveryMethod: {
    type: String,
    enum: ['Tự đến lấy', 'Giao tận nơi'],
    required: true
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  finalPrice: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Tiền mặt', 'Chuyển khoản'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Chờ thanh toán', 'Đã thanh toán'],
    default: 'Chờ thanh toán'
  },
  status: {
    type: String,
    enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Sẵn sàng giao', 'Đã giao', 'Đã hoàn thành', 'Đã hủy'],
    default: 'Chờ xác nhận'
  },
  notes: String,
  deliveryAddress: {
    building: String,
    floor: String,
    apartmentNumber: String
  },
  scheduledTime: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `CHO${Date.now().toString().slice(-8)}${(count + 1).toString().padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
