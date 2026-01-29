const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Vui lòng nhập tên sản phẩm'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Vui lòng nhập mô tả sản phẩm']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Đồ ăn sáng',
      'Cơm văn phòng',
      'Đồ ăn vặt',
      'Chè & Tráng miệng',
      'Thực phẩm tươi sống',
      'Đồ handmade',
      'Đồ cũ - Thanh lý',
      'Nhu yếu phẩm',
      'Khác'
    ]
  },
  price: {
    type: Number,
    required: [true, 'Vui lòng nhập giá sản phẩm'],
    min: 0
  },
  images: [{
    type: String
  }],
  stock: {
    type: Number,
    default: 1,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  address: {
    building: String,
    floor: String,
    apartmentNumber: String
  },
  deliveryOptions: [{
    type: String,
    enum: ['Tự đến lấy', 'Giao tận nơi']
  }],
  deliveryFee: {
    type: Number,
    default: 0
  },
  pickupDiscount: {
    type: Number,
    default: 0
  },
  preOrderOnly: {
    type: Boolean,
    default: false
  },
  availableTime: {
    start: String,
    end: String
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
productSchema.index({ location: '2dsphere' });
productSchema.index({ seller: 1, isAvailable: 1 });
productSchema.index({ category: 1, isAvailable: 1 });

// Update timestamp on save
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);
