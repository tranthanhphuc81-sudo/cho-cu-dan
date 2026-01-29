# DEBUG GUIDE - Hướng dẫn sửa lỗi

## Các bước debug:

### 1. Kiểm tra Console (F12)

**Trong trình duyệt, mở Console (F12) và kiểm tra:**
- Có lỗi JavaScript không?
- Request/Response của API như thế nào?

### 2. Kiểm tra Terminal Server

**Xem log trong terminal chạy server:**
```
Tìm dòng: "Order creation error:" 
Hoặc: "Creating order - Request body:"
```

### 3. Test từng bước:

#### A. Test Đăng nhập:
1. Mở Console
2. Gõ: `console.log(localStorage.getItem('token'))`
3. Phải có token, nếu null => Đăng nhập lại

#### B. Test Đặt hàng:
1. Click vào sản phẩm
2. Mở Console trước khi click "MUA NGAY"
3. Xem log: "Creating order with data:"
4. Xem response: "Order response:"

#### C. Kiểm tra data:
```javascript
// Trong Console:
console.log('Current user:', state.user);
console.log('Current product:', window.currentOrderProduct);
```

### 4. Các lỗi thường gặp:

**Lỗi: "Cannot read property '_id' of undefined"**
- Nguyên nhân: User chưa login hoặc token hết hạn
- Giải pháp: Đăng xuất và đăng nhập lại

**Lỗi: "Product not found"**
- Nguyên nhân: ProductId không đúng
- Giải pháp: Kiểm tra trong Console: `window.currentOrderProduct`

**Lỗi: "Validation failed"**
- Nguyên nhân: Thiếu field bắt buộc
- Giải pháp: Kiểm tra form có đầy đủ không

### 5. Hard Reset nếu cần:

```javascript
// Trong Console, gõ:
localStorage.clear();
location.reload();
```

Sau đó đăng ký/đăng nhập lại.

### 6. Kiểm tra MongoDB:

```bash
# Vào MongoDB shell
mongosh

# Dùng database
use cho-cu-dan

# Kiểm tra users
db.users.find().pretty()

# Kiểm tra products
db.products.find().pretty()

# Kiểm tra orders
db.orders.find().pretty()
```

### 7. Reset Database nếu cần:

```bash
# Xóa tất cả collections
mongosh
use cho-cu-dan
db.users.deleteMany({})
db.products.deleteMany({})
db.orders.deleteMany({})
```

## Lỗi cụ thể và cách sửa:

### Lỗi: "Nút chỉ hiện khi hover"
✅ ĐÃ SỬA - Thêm CSS: opacity: 1, visibility: visible

### Lỗi: "Mất tiêu đề modal"
✅ ĐÃ SỬA - Thêm CSS cho .modal-content h2

### Lỗi: "Server error khi đặt hàng"
✅ ĐÃ SỬA - Sửa req.user.id thành req.user._id

## Test lại toàn bộ:

1. **Restart server:**
   ```bash
   # Nhấn Ctrl+C trong terminal
   npm run dev
   ```

2. **Clear cache và reload:**
   - Ctrl + Shift + R (hard reload)

3. **Test workflow:**
   - Đăng ký tài khoản mới
   - Đăng sản phẩm
   - Đăng nhập tài khoản khác
   - Đặt hàng
   - Kiểm tra trong tab "Đơn mua" và "Đơn bán"

## Contact Support:

Nếu vẫn lỗi, screenshot:
1. Console (F12) - tab Console
2. Console (F12) - tab Network - request bị lỗi
3. Terminal server log
