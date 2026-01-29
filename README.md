[![Build Status](https://github.com/tranthanhphuc81-sudo/cho-cu-dan/actions/workflows/ci.yml/badge.svg)](https://github.com/tranthanhphuc81-sudo/cho-cu-dan/actions)
[![License](https://img.shields.io/github/license/tranthanhphuc81-sudo/cho-cu-dan)](LICENSE)

# 🏘️ CHỢ CƯ DÂN (Neighborhood Market)

## Slogan: Mua nhanh - Bán gần - Tình thân gắn kết

> CI: Tests run automatically on push and pull requests (GitHub Actions).



Ứng dụng thương mại điện tử "siêu địa phương" (Hyper-local), kết nối cư dân trong khu dân cư để mua bán hàng hóa, thực phẩm và trao đổi đồ cũ với lợi thế:
- ✅ Không tốn phí ship (hoặc rất thấp)
- ✅ Giao hàng tức thì
- ✅ Tin tưởng giữa hàng xóm láng giềng

## 📋 Tính năng chính

### Dành cho Người mua
- 🔍 Lướt tin theo vị trí (tự động hiển thị gian hàng cùng tòa nhà/khu phố)
- 📱 Đặt hàng & Hẹn giờ
- ♻️ "Săn" hàng thanh lý từ hàng xóm
- 💬 Chat trực tiếp với người bán
- ⭐ Đánh giá & Review sản phẩm

### Dành cho Người bán
- 📸 Đăng tin siêu tốc (< 30 giây)
- 📦 Quản lý đơn hàng dễ dàng
- 🔄 Bật/tắt trạng thái "Đang mở/Đóng cửa"
- 📊 Theo dõi doanh số
- ✓ Xác thực cư dân (tích xanh)

### Danh mục sản phẩm
- 🥖 Đồ ăn sáng
- 🍱 Cơm văn phòng
- 🍪 Đồ ăn vặt
- 🍮 Chè & Tráng miệng
- 🐟 Thực phẩm tươi sống
- 🎨 Đồ handmade
- ♻️ Đồ cũ - Thanh lý
- 🛒 Nhu yếu phẩm

## 🛠️ Công nghệ sử dụng

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.IO** - Real-time chat
- **Multer** - File upload
- **Bcrypt** - Password hashing

### Frontend
- **HTML5/CSS3** - Markup & Styling
- **JavaScript (Vanilla)** - Client-side logic
- **Font Awesome** - Icons
- **Socket.IO Client** - Real-time messaging

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js 14+ 
- MongoDB 4.4+
- NPM hoặc Yarn

### Các bước cài đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd chocudan
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Cấu hình môi trường**
```bash
# Copy file .env.example thành .env
copy .env.example .env

# Chỉnh sửa file .env với thông tin của bạn
# - MONGODB_URI: Đường dẫn MongoDB
# - JWT_SECRET: Secret key cho JWT
# - PORT: Cổng chạy server (mặc định 3000)
# - ADMIN_EMAIL: Email tài khoản admin mặc định (ví dụ: admin@local.test)
# - ADMIN_PASSWORD: Mật khẩu tài khoản admin mặc định (ví dụ: admin123)
```

**Tạo tài khoản admin (tuỳ chọn)**

Sau khi đã thiết lập `.env`, bạn có thể tạo tài khoản admin mặc định bằng script seed:

```bash
npm run seed:admin
```

Lệnh sẽ tạo tài khoản admin với email và mật khẩu theo `ADMIN_EMAIL`/`ADMIN_PASSWORD` trong `.env`. Nếu tài khoản đã tồn tại, script sẽ báo và không tạo lại.

4. **Khởi động MongoDB**
```bash
# Nếu MongoDB chạy local:
mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
```

5. **Chạy ứng dụng**

**Development mode (với nodemon):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

6. **Truy cập ứng dụng**
```
Mở trình duyệt và truy cập: http://localhost:3000
```

## 📂 Cấu trúc thư mục

```
chocudan/
├── config/
│   └── database.js          # Cấu hình database
├── middleware/
│   ├── auth.js              # Middleware xác thực
│   └── upload.js            # Middleware upload file
├── models/
│   ├── User.js              # Model người dùng
│   ├── Product.js           # Model sản phẩm
│   ├── Order.js             # Model đơn hàng
│   └── Message.js           # Model tin nhắn
├── routes/
│   ├── auth.js              # Routes xác thực
│   ├── users.js             # Routes người dùng
│   ├── products.js          # Routes sản phẩm
│   ├── orders.js            # Routes đơn hàng
│   └── messages.js          # Routes tin nhắn
├── public/
│   ├── index.html           # Giao diện chính
│   ├── css/
│   │   └── style.css        # CSS styling
│   └── js/
│       └── app.js           # JavaScript client
├── uploads/                 # Thư mục chứa file upload
├── .env.example             # File cấu hình mẫu
├── .gitignore              
├── package.json             
├── server.js                # File khởi động server
└── README.md               
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập

### Users
- `GET /api/users/profile` - Lấy thông tin profile
- `PUT /api/users/profile` - Cập nhật profile
- `POST /api/users/verify` - Upload giấy tờ xác minh
- `GET /api/users/nearby` - Tìm người dùng gần đó

### Products
- `GET /api/products` - Lấy danh sách sản phẩm (có filter)
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm mới (cần auth)
- `PUT /api/products/:id` - Cập nhật sản phẩm (cần auth)
- `DELETE /api/products/:id` - Xóa sản phẩm (cần auth)
- `POST /api/products/:id/reviews` - Thêm đánh giá
- `GET /api/products/seller/:sellerId` - Lấy sản phẩm theo người bán

### Orders
- `POST /api/orders` - Tạo đơn hàng (cần auth)
- `GET /api/orders` - Lấy danh sách đơn hàng (cần auth)
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng (cần auth)
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (seller)
- `PUT /api/orders/:id/cancel` - Hủy đơn hàng (buyer)

### Messages
- `GET /api/messages/:roomId` - Lấy tin nhắn trong room
- `POST /api/messages` - Gửi tin nhắn (cần auth)
- `GET /api/messages/conversations/list` - Lấy danh sách cuộc trò chuyện

## 🔐 Xác thực

API sử dụng JWT (JSON Web Token) để xác thực. Sau khi đăng nhập/đăng ký thành công, client sẽ nhận được token.

**Cách sử dụng:**
```javascript
// Thêm vào header của request
Authorization: Bearer <your-token-here>
```

## 💬 Real-time Chat

Ứng dụng sử dụng Socket.IO cho chat real-time:

```javascript
// Client kết nối
socket.emit('join-room', roomId);

// Gửi tin nhắn
socket.emit('send-message', { roomId, message, senderId, receiverId });

// Nhận tin nhắn
socket.on('receive-message', (data) => {
    // Xử lý tin nhắn
});
```

## 📱 Hướng dẫn sử dụng

### Đối với người mua:
1. Đăng ký/Đăng nhập tài khoản
2. Duyệt sản phẩm theo danh mục hoặc tìm kiếm
3. Xem chi tiết sản phẩm và thông tin người bán
4. Chat với người bán để hỏi thêm
5. Đặt hàng và chọn phương thức giao nhận
6. Theo dõi trạng thái đơn hàng
7. Đánh giá sau khi nhận hàng

### Đối với người bán:
1. Đăng ký/Đăng nhập tài khoản
2. Upload giấy tờ xác minh (để có tích xanh)
3. Đăng sản phẩm với ảnh và thông tin chi tiết
4. Nhận thông báo khi có đơn hàng
5. Xác nhận và cập nhật trạng thái đơn hàng
6. Giao hàng cho khách

### Admin Dashboard
- Truy cập: `http://localhost:3000/admin.html`
- Chức năng: Đăng nhập bằng tài khoản admin, quản lý người dùng (đổi role, verify, xóa), xem tất cả đơn hàng.
- Ghi chú: Các thao tác chỉ thực hiện khi token admin hợp lệ (admin role).


## 🚀 Triển khai (Deployment)

### Triển khai lên Heroku
```bash
# Đăng nhập Heroku
heroku login

# Tạo app mới
heroku create cho-cu-dan

# Set environment variables
heroku config:set MONGODB_URI=<your-mongodb-uri>
heroku config:set JWT_SECRET=<your-jwt-secret>

# Deploy
git push heroku main
```

### Triển khai lên VPS
1. SSH vào VPS
2. Clone repository
3. Cài đặt Node.js và MongoDB
4. Cấu hình .env
5. Sử dụng PM2 để chạy app:
```bash
npm install -g pm2
pm2 start server.js --name cho-cu-dan
pm2 save
pm2 startup
```

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Dự án này được phát hành dưới giấy phép ISC.

## 📞 Liên hệ

- Email: support@chocudan.com
- Website: https://chocudan.com
- Facebook: https://facebook.com/chocudan

## 🎯 Roadmap

### Version 1.1 (Coming soon)
- [ ] Thông báo push notification
- [ ] Tích hợp thanh toán online (VNPay, Momo)
- [ ] Map hiển thị vị trí người bán
- [ ] Hệ thống điểm thưởng

### Version 2.0 (Future)
- [ ] Mobile app (React Native)
- [ ] Video call để xem sản phẩm
- [ ] AI gợi ý sản phẩm
- [ ] Hệ thống giao hàng tự động (robot)

---

**Made with ❤️ for Vietnamese community**

🏘️ **Chợ Cư Dân - Mua nhanh, Bán gần, Tình thân gắn kết!**
