// API Base URL
const API_URL = 'http://localhost:3000/api';

// State Management
const state = {
    user: null,
    token: localStorage.getItem('token'),
    currentPage: 'home',
    products: [],
    orders: [],
    messages: []
};

// Socket.IO
const socket = io('http://localhost:3000');

// Socket.IO event listeners
socket.on('connect', () => {
    console.log('Connected to Socket.IO server');
});

socket.on('receive-message', (data) => {
    // Check if this message is from current user (avoid duplicate)
    const senderId = data.message.sender._id || data.message.sender;
    const isMyMessage = senderId === state.user._id;
    
    // Only show message if it's from someone else (not from me)
    if (!isMyMessage && currentRoomId === data.roomId) {
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            const noMessages = messagesList.querySelector('.no-messages');
            if (noMessages) {
                noMessages.remove();
            }
            
            const messageHTML = `
                <div class="message received" data-message-id="${data.message._id}">
                    <div class="message-bubble">
                        <div class="message-content">${data.message.content}</div>
                        <div class="message-footer">
                            <div class="message-time">${new Date().toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                            })}</div>
                        </div>
                    </div>
                </div>
            `;
            messagesList.insertAdjacentHTML('beforeend', messageHTML);
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }
    
    // Refresh conversations list to show new message preview (for both sender and receiver)
    if (state.currentPage === 'messages' && !isMyMessage) {
        loadConversations();
    }
});

socket.on('recall-message', (data) => {
    // Remove recalled message from UI for receiver
    if (currentRoomId === data.roomId) {
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    }
});

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuth();
});

function initializeApp() {
    if (state.token) {
        loadUserData();
    }
    loadProducts();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            filterByCategory(category);
        });
    });

    // Login/Register
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        openModal('loginModal');
    });

    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });

    // Auth form tabs
    document.querySelectorAll('.modal .tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const formType = e.target.dataset.form;
            switchAuthForm(formType);
        });
    });

    // Forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);

    // Add product button
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        if (!state.token) {
            alert('Vui lòng đăng nhập để đăng bán sản phẩm');
            openModal('loginModal');
            return;
        }
        openModal('addProductModal');
    });

    // Filters
    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
        loadProducts({ category: e.target.value });
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        debounce(() => loadProducts({ search: e.target.value }), 500)();
    });

    // Order tabs
    document.querySelectorAll('#ordersPage .tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            loadOrders(type);
            document.querySelectorAll('#ordersPage .tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Order form
    document.getElementById('orderForm')?.addEventListener('submit', handleCreateOrder);
    
    // Order quantity change
    document.getElementById('orderQuantity')?.addEventListener('input', updateOrderSummary);
    document.getElementById('orderDeliveryMethod')?.addEventListener('change', updateOrderSummary);
}

// Navigation
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`${page}Page`).classList.add('active');
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    state.currentPage = page;

    // Load page-specific data
    if (page === 'products') {
        loadProducts();
    } else if (page === 'orders' && state.token) {
        loadOrders('buyer');
    } else if (page === 'messages' && state.token) {
        loadConversations();
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            state.token = result.token;
            state.user = result.user;
            localStorage.setItem('token', result.token);
            // Nếu user là admin thì đồng bộ adminToken và chuyển sang admin dashboard
            if (result.user && result.user.role === 'admin') {
                localStorage.setItem('adminToken', result.token);
                window.location.href = '/admin.html';
            }
            updateUI();
            closeModal('loginModal');
            showNotification('Đăng nhập thành công!', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Structure address
    const address = {
        building: data.building,
        floor: data.floor,
        apartmentNumber: data.apartmentNumber
    };

    const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        address
    };

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            state.token = result.token;
            state.user = result.user;
            localStorage.setItem('token', result.token);
            updateUI();
            closeModal('loginModal');
            showNotification('Đăng ký thành công!', 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

function checkAuth() {
    if (state.token) {
        loadUserData();
    }
}

async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        const result = await response.json();

        if (result.success) {
            state.user = result.user;
            updateUI();
        } else {
            logout();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    updateUI();
    navigateTo('home');
    showNotification('Đã đăng xuất', 'info');
}

function updateUI() {
    const userMenu = document.getElementById('userMenu');
    
    if (state.user) {
        userMenu.innerHTML = `
            <div class="user-info">
                <span>Xin chào, ${state.user.name}</span>
                <a href="/dashboard.html" class="btn btn-outline">Dashboard</a>
                ${state.user.role === 'admin' ? '<a href="/admin.html" class="btn btn-outline">Admin</a>' : ''}
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Đăng xuất
                </button>
            </div>
        `;
    } else {
        userMenu.innerHTML = `
            <button class="btn btn-primary" id="loginBtn">
                <i class="fas fa-sign-in-alt"></i> Đăng nhập
            </button>
        `;
        document.getElementById('loginBtn').addEventListener('click', () => {
            openModal('loginModal');
        });
    }
}

// Products
async function loadProducts(filters = {}) {
    try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`${API_URL}/products?${params}`);
        const result = await response.json();

        if (result.success) {
            state.products = result.products;
            displayProducts(result.products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const productGrid = document.getElementById('productGrid');
    const allProductsGrid = document.getElementById('allProductsGrid');

    const html = products.map(product => createProductCard(product)).join('');

    if (productGrid) productGrid.innerHTML = html || '<p class="loading">Chưa có sản phẩm nào</p>';
    if (allProductsGrid) allProductsGrid.innerHTML = html || '<p class="loading">Chưa có sản phẩm nào</p>';
}

function createProductCard(product) {
    const imageUrl = product.images && product.images.length > 0 
        ? `/${product.images[0]}` 
        : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f3f4f6" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EKhông có ảnh%3C/text%3E%3C/svg%3E';
    
    return `
        <div class="product-card" onclick="viewProduct('${product._id}')">
            <img src="${imageUrl}" alt="${product.title}" class="product-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EKh%C3%B4ng c%C3%B3 %E1%BA%A3nh%3C/text%3E%3C/svg%3E'">
            <div class="product-info">
                <h4 class="product-title">${product.title}</h4>
                <div class="product-price">${formatPrice(product.price)}</div>
                <div class="product-meta">
                    <span>${product.seller?.name || 'Người bán'}</span>
                    ${product.seller?.isVerified ? '<span class="product-badge badge-verified">✓ Đã xác minh</span>' : ''}
                </div>
                ${product.isAvailable ? '<span class="product-badge badge-available">Còn hàng</span>' : '<span class="product-badge">Hết hàng</span>'}
            </div>
        </div>
    `;
}

async function handleAddProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Get delivery options
    const deliveryOptions = [];
    document.querySelectorAll('input[name="deliveryOptions"]:checked').forEach(cb => {
        deliveryOptions.push(cb.value);
    });
    formData.set('deliveryOptions', JSON.stringify(deliveryOptions));

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Đăng sản phẩm thành công!', 'success');
            closeModal('addProductModal');
            e.target.reset();
            loadProducts();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

async function viewProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        const result = await response.json();

        if (result.success) {
            displayProductDetail(result.product);
            openModal('productDetailModal');
        } else {
            showNotification('Không thể tải thông tin sản phẩm', 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

function displayProductDetail(product) {
    const imageUrl = product.images && product.images.length > 0 
        ? `/${product.images[0]}` 
        : '/uploads/placeholder.jpg';
    
    const deliveryOptions = product.deliveryOptions?.join(', ') || 'Không có thông tin';
    const canOrder = product.isAvailable && product.stock > 0;
    
    const html = `
        <div class="product-detail">
            <div class="product-detail-images">
                <img src="${imageUrl}" alt="${product.title}" class="main-image" onerror="this.src='/uploads/placeholder.jpg'">
                ${product.images?.length > 1 ? `
                    <div class="thumbnail-images">
                        ${product.images.map((img, idx) => `
                            <img src="/${img}" alt="${product.title}" class="thumbnail" 
                                 onclick="document.querySelector('.main-image').src='/${img}'"
                                 onerror="this.src='/uploads/placeholder.jpg'">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="product-detail-info">
                <h2>${product.title}</h2>
                <div class="product-detail-price">${formatPrice(product.price)}</div>
                
                <div class="product-detail-meta">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>Người bán: <strong>${product.seller?.name}</strong></span>
                        ${product.seller?.isVerified ? '<span class="badge-verified">✓ Đã xác minh</span>' : ''}
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${product.address?.building || 'Không có thông tin'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-box"></i>
                        <span>Còn lại: <strong>${product.stock}</strong></span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-truck"></i>
                        <span>${deliveryOptions}</span>
                    </div>
                    ${product.deliveryFee > 0 ? `
                        <div class="meta-item">
                            <i class="fas fa-money-bill"></i>
                            <span>Phí giao hàng: ${formatPrice(product.deliveryFee)}</span>
                        </div>
                    ` : ''}
                    ${product.pickupDiscount > 0 ? `
                        <div class="meta-item">
                            <i class="fas fa-gift"></i>
                            <span>Giảm ${formatPrice(product.pickupDiscount)} nếu tự đến lấy</span>
                        </div>
                    ` : ''}
                </div>

                <div class="product-description">
                    <h3>Mô tả sản phẩm</h3>
                    <p>${product.description}</p>
                </div>

                ${product.rating?.count > 0 ? `
                    <div class="product-rating">
                        <h3>Đánh giá (${product.rating.count})</h3>
                        <div class="rating-average">
                            <span class="rating-stars">${'★'.repeat(Math.round(product.rating.average))}${'☆'.repeat(5 - Math.round(product.rating.average))}</span>
                            <span>${product.rating.average.toFixed(1)}/5</span>
                        </div>
                    </div>
                ` : ''}

                <div class="product-actions">
                    ${canOrder ? `
                        <button class="btn btn-primary btn-block" onclick="openOrderModal('${product._id}')">
                            <i class="fas fa-shopping-cart"></i> MUA NGAY
                        </button>
                        <button class="btn btn-outline btn-block" onclick="contactSeller('${product.seller?._id}')">
                            <i class="fas fa-comments"></i> Nhắn tin cho người bán
                        </button>
                    ` : `
                        <button class="btn btn-block" disabled>
                            <i class="fas fa-times"></i> Hết hàng
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('productDetailContent').innerHTML = html;
}

function openOrderModal(productId) {
    if (!state.token) {
        showNotification('Vui lòng đăng nhập để đặt hàng', 'error');
        openModal('loginModal');
        return;
    }

    const product = state.products.find(p => p._id === productId);
    if (!product) {
        showNotification('Không tìm thấy sản phẩm', 'error');
        return;
    }

    // Set product info
    document.getElementById('orderProductId').value = productId;
    
    const imageUrl = product.images && product.images.length > 0 
        ? `/${product.images[0]}` 
        : '/uploads/placeholder.jpg';
    
    document.getElementById('orderProductInfo').innerHTML = `
        <div class="order-product-preview">
            <img src="${imageUrl}" alt="${product.title}" onerror="this.src='/uploads/placeholder.jpg'">
            <div>
                <h4>${product.title}</h4>
                <p class="price">${formatPrice(product.price)}</p>
            </div>
        </div>
    `;

    // Set delivery options
    const deliverySelect = document.getElementById('orderDeliveryMethod');
    deliverySelect.innerHTML = '<option value="">Chọn phương thức</option>';
    
    if (product.deliveryOptions && product.deliveryOptions.length > 0) {
        product.deliveryOptions.forEach(option => {
            deliverySelect.innerHTML += `<option value="${option}">${option}</option>`;
        });
    } else {
        deliverySelect.innerHTML += '<option value="Tự đến lấy">Tự đến lấy</option>';
    }

    // Set max quantity
    document.getElementById('orderQuantity').max = product.stock;
    
    // Store product data for calculation
    window.currentOrderProduct = product;
    
    // Calculate initial price
    updateOrderSummary();

    closeModal('productDetailModal');
    openModal('orderModal');
}

function filterByCategory(category) {
    navigateTo('products');
    document.getElementById('categoryFilter').value = category;
    loadProducts({ category });
}

function updateOrderSummary() {
    if (!window.currentOrderProduct) return;

    const product = window.currentOrderProduct;
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;
    const deliveryMethod = document.getElementById('orderDeliveryMethod').value;

    const subtotal = product.price * quantity;
    let deliveryFee = 0;
    let discount = 0;

    if (deliveryMethod === 'Giao tận nơi') {
        deliveryFee = product.deliveryFee || 0;
    } else if (deliveryMethod === 'Tự đến lấy') {
        discount = product.pickupDiscount || 0;
    }

    const total = subtotal + deliveryFee - discount;

    document.getElementById('orderSubtotal').textContent = formatPrice(subtotal);
    document.getElementById('orderDeliveryFee').textContent = formatPrice(deliveryFee);
    document.getElementById('orderDiscount').textContent = formatPrice(discount);
    document.getElementById('orderTotal').textContent = formatPrice(total);
}

async function handleCreateOrder(e) {
    e.preventDefault();
    
    if (!state.token) {
        showNotification('Vui lòng đăng nhập', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    console.log('Creating order with data:', data);

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Order response:', result);

        if (result.success) {
            showNotification('Đặt hàng thành công! Người bán sẽ liên hệ với bạn sớm.', 'success');
            closeModal('orderModal');
            e.target.reset();
            navigateTo('orders');
            loadOrders('buyer');
        } else {
            showNotification(result.message || 'Có lỗi xảy ra', 'error');
            console.error('Order error:', result);
        }
    } catch (error) {
        console.error('Order fetch error:', error);
        showNotification('Lỗi kết nối server: ' + error.message, 'error');
    }
}

async function contactSeller(sellerId) {
    if (!state.token) {
        showNotification('Vui lòng đăng nhập để nhắn tin', 'error');
        openModal('loginModal');
        return;
    }
    
    try {
        // Fetch seller info
        const response = await fetch(`${API_URL}/users/${sellerId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const seller = result.user;
            
            // Create room ID (always sort user IDs to ensure consistency)
            const userIds = [state.user._id, sellerId].sort();
            const roomId = `${userIds[0]}_${userIds[1]}`;
            
            // Navigate to messages and open chat
            navigateTo('messages');
            
            // Wait for page to load, then open chat
            setTimeout(() => {
                openChat(roomId, sellerId, seller.fullName);
            }, 100);
        } else {
            showNotification('Không thể mở chat', 'error');
        }
    } catch (error) {
        console.error('Error opening chat with seller:', error);
        showNotification('Lỗi khi mở chat', 'error');
    }
}

// Orders
async function loadOrders(type = 'buyer') {
    if (!state.token) return;

    try {
        const response = await fetch(`${API_URL}/orders?type=${type}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        const result = await response.json();

        if (result.success) {
            state.orders = result.orders;
            displayOrders(result.orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');

    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<p class="loading">Chưa có đơn hàng nào</p>';
        return;
    }

    const html = orders.map(order => createOrderCard(order)).join('');
    ordersList.innerHTML = html;
}

function createOrderCard(order) {
    const statusClass = order.status.toLowerCase().replace(/ /g, '-').replace(/đ/g, 'd').replace(/ã/g, 'a').replace(/ư/g, 'u').replace(/ơ/g, 'o').replace(/ế/g, 'e').replace(/ộ/g, 'o').replace(/ủ/g, 'u').replace(/ì/g, 'i').replace(/à/g, 'a');
    const imageUrl = order.productSnapshot?.image ? `/${order.productSnapshot.image}` : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3ENo img%3C/text%3E%3C/svg%3E';
    
    // Handle both populated and non-populated references
    const sellerId = order.seller?._id || order.seller;
    const buyerId = order.buyer?._id || order.buyer;
    const userId = state.user?._id || state.user?.id;
    
    const isSeller = state.user && sellerId.toString() === userId.toString();
    const isBuyer = state.user && buyerId.toString() === userId.toString();
    
    const otherParty = isSeller ? order.buyer : order.seller;
    const otherPartyName = otherParty?.name || 'Không rõ';
    const otherPartyId = otherParty?._id || otherParty;

    return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <span class="order-number">Đơn hàng: ${order.orderNumber}</span>
                    <div class="order-party">
                        ${isSeller ? `Người mua: ${otherPartyName}` : `Người bán: ${otherPartyName}`}
                    </div>
                </div>
                <span class="order-status status-${statusClass}">${order.status}</span>
            </div>
            <div class="order-content">
                <img src="${imageUrl}" alt="${order.productSnapshot?.title}" class="order-product-image" onerror="this.src='/uploads/placeholder.jpg'">
                <div class="order-details">
                    <h4>${order.productSnapshot?.title}</h4>
                    <p><i class="fas fa-box"></i> Số lượng: ${order.quantity}</p>
                    <p><i class="fas fa-money-bill"></i> Giá: ${formatPrice(order.finalPrice)}</p>
                    <p><i class="fas fa-truck"></i> Phương thức: ${order.deliveryMethod}</p>
                    <p><i class="fas fa-calendar"></i> Ngày đặt: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                    ${order.notes ? `<p><i class="fas fa-note-sticky"></i> Ghi chú: ${order.notes}</p>` : ''}
                </div>
                <div class="order-actions">
                    ${isSeller && ['Chờ xác nhận'].includes(order.status) ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order._id}', 'Đã xác nhận')">
                            <i class="fas fa-check"></i> Xác nhận
                        </button>
                    ` : ''}
                    ${isSeller && ['Đã xác nhận'].includes(order.status) ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order._id}', 'Đang chuẩn bị')">
                            <i class="fas fa-box"></i> Đang chuẩn bị
                        </button>
                    ` : ''}
                    ${isSeller && ['Đang chuẩn bị'].includes(order.status) ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order._id}', 'Sẵn sàng giao')">
                            <i class="fas fa-truck"></i> Sẵn sàng giao
                        </button>
                    ` : ''}
                    ${isSeller && ['Sẵn sàng giao'].includes(order.status) ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order._id}', 'Đã giao')">
                            <i class="fas fa-check-circle"></i> Đã giao hàng
                        </button>
                    ` : ''}
                    ${isSeller && ['Đã giao'].includes(order.status) ? `
                        <button class="btn btn-primary btn-sm" onclick="updateOrderStatus('${order._id}', 'Đã hoàn thành')">
                            <i class="fas fa-star"></i> Hoàn thành
                        </button>
                    ` : ''}
                    ${isBuyer && ['Chờ xác nhận', 'Đã xác nhận'].includes(order.status) ? `
                        <button class="btn btn-outline btn-sm" onclick="cancelOrder('${order._id}')">
                            <i class="fas fa-times"></i> Hủy đơn
                        </button>
                    ` : ''}
                    <button class="btn btn-outline btn-sm" onclick="contactAboutOrder('${order._id}', '${otherPartyId}')">
                        <i class="fas fa-comments"></i> Nhắn tin
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function updateOrderStatus(orderId, status) {
    if (!state.token) return;

    if (!confirm(`Xác nhận cập nhật trạng thái đơn hàng thành "${status}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Cập nhật trạng thái thành công', 'success');
            loadOrders('seller');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

async function cancelOrder(orderId) {
    if (!state.token) return;

    const reason = prompt('Lý do hủy đơn hàng (không bắt buộc):');
    if (reason === null) return; // User clicked cancel

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Đã hủy đơn hàng', 'success');
            loadOrders('buyer');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Lỗi kết nối server', 'error');
    }
}

async function contactAboutOrder(orderId, userId) {
    if (!state.token) {
        showNotification('Vui lòng đăng nhập', 'error');
        return;
    }
    
    try {
        // Fetch user info
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const otherUser = result.user;
            
            // Create room ID (always sort user IDs to ensure consistency)
            const userIds = [state.user._id, userId].sort();
            const roomId = `${userIds[0]}_${userIds[1]}`;
            
            // Navigate to messages and open chat
            navigateTo('messages');
            
            // Wait for page to load, then open chat with order context
            setTimeout(() => {
                openChat(roomId, userId, otherUser.fullName);
                
                // Pre-fill message about order
                setTimeout(() => {
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput) {
                        messageInput.value = `Xin chào, tôi muốn hỏi về đơn hàng #${orderId.substring(orderId.length - 8).toUpperCase()}`;
                        messageInput.focus();
                    }
                }, 100);
            }, 100);
        } else {
            showNotification('Không thể mở chat', 'error');
        }
    } catch (error) {
        console.error('Error opening chat about order:', error);
        showNotification('Lỗi khi mở chat', 'error');
    }
}

// Messages
let currentRoomId = null;
let currentChatUser = null;

async function loadConversations() {
    if (!state.token) return;

    try {
        const response = await fetch(`${API_URL}/messages/conversations/list`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        const result = await response.json();

        if (result.success) {
            displayConversations(result.conversations);
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');

    if (!conversations || conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Chưa có tin nhắn nào</p>
            </div>
        `;
        return;
    }

    conversationsList.innerHTML = conversations.map(conv => {
        const otherUser = conv.otherUser || {};
        const lastMessage = conv.lastMessage || '';
        const unreadCount = conv.unreadCount || 0;
        
        // Safe fallback for user info
        const userName = otherUser.fullName || otherUser.email || 'Người dùng';
        const userId = otherUser._id || '';
        
        return `
            <div class="conversation-item ${conv.roomId === currentRoomId ? 'active' : ''}" 
                 onclick="openChat('${conv.roomId}', '${userId}', '${userName}')">
                <div class="conversation-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${userName}</span>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                    <div class="conversation-preview">
                        ${lastMessage ? lastMessage.substring(0, 50) + (lastMessage.length > 50 ? '...' : '') : 'Chưa có tin nhắn'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openChat(roomId, userId, userName) {
    currentRoomId = roomId;
    currentChatUser = { id: userId, name: userName };
    
    // Update active conversation
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('.conversation-item').classList.add('active');
    }
    
    // Show chat area FIRST (create HTML structure)
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = `
        <div class="chat-header">
            <div class="chat-user-info">
                <i class="fas fa-user-circle"></i>
                <span>${userName}</span>
            </div>
        </div>
        <div class="messages-list" id="messagesList">
            <p class="no-messages">Đang tải tin nhắn...</p>
        </div>
        <div class="message-input-container">
            <input type="text" id="messageInput" placeholder="Nhập tin nhắn..." onkeypress="handleMessageKeyPress(event)" />
            <button onclick="sendMessage()" class="btn btn-primary">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    
    // Load messages AFTER creating the messagesList element
    await loadMessages(roomId);
    
    // Join Socket.IO room
    if (socket && socket.connected) {
        socket.emit('join-room', roomId);
    }
}

function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function loadMessages(roomId) {
    if (!state.token) return;

    try {
        const response = await fetch(`${API_URL}/messages/${roomId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        const result = await response.json();

        if (result.success) {
            displayMessages(result.messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = '<p class="no-messages">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>';
        return;
    }
    
    messagesList.innerHTML = messages.map(msg => {
        const isSender = msg.sender === state.user._id || msg.sender._id === state.user._id;
        const senderName = typeof msg.sender === 'object' ? msg.sender.fullName : '';
        
        // Check if message can be recalled (within 5 minutes)
        const timeDiff = Date.now() - new Date(msg.createdAt).getTime();
        const canRecall = isSender && timeDiff < 5 * 60 * 1000;
        
        return `
            <div class="message ${isSender ? 'sent' : 'received'}" data-message-id="${msg._id}">
                <div class="message-bubble">
                    ${!isSender && senderName ? `<div class="message-sender">${senderName}</div>` : ''}
                    <div class="message-content">${msg.content}</div>
                    <div class="message-footer">
                        <div class="message-time">${new Date(msg.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                        })}</div>
                        ${canRecall ? `<button class="message-recall-btn" onclick="recallMessage('${msg._id}')" title="Thu hồi tin nhắn"><i class="fas fa-undo"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentRoomId || !state.token) return;
    
    try {
        const response = await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                roomId: currentRoomId,
                receiver: currentChatUser.id,
                content: content
            })
        });

        const result = await response.json();

        if (result.success) {
            input.value = '';
            
            // Emit via Socket.IO for real-time delivery
            if (socket && socket.connected) {
                socket.emit('send-message', {
                    roomId: currentRoomId,
                    message: result.message
                });
            }
            
            // Add message to UI immediately
            const messagesList = document.getElementById('messagesList');
            const noMessages = messagesList.querySelector('.no-messages');
            if (noMessages) {
                noMessages.remove();
            }
            
            const messageHTML = `
                <div class="message sent" data-message-id="${result.message._id}">
                    <div class="message-bubble">
                        <div class="message-content">${result.message.content}</div>
                        <div class="message-footer">
                            <div class="message-time">${new Date().toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                            })}</div>
                            <button class="message-recall-btn" onclick="recallMessage('${result.message._id}')" title="Thu hồi tin nhắn"><i class="fas fa-undo"></i></button>
                        </div>
                    </div>
                </div>
            `;
            messagesList.insertAdjacentHTML('beforeend', messageHTML);
            messagesList.scrollTop = messagesList.scrollHeight;
        } else {
            showNotification(result.message || 'Không thể gửi tin nhắn', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Lỗi khi gửi tin nhắn', 'error');
    }
}

async function recallMessage(messageId) {
    if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            // Remove message from UI
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // Emit via Socket.IO to notify other user
            if (socket && socket.connected) {
                socket.emit('recall-message', {
                    roomId: result.roomId,
                    messageId: messageId
                });
            }
            
            showNotification('Đã thu hồi tin nhắn', 'success');
        } else {
            showNotification(result.message || 'Không thể thu hồi tin nhắn', 'error');
        }
    } catch (error) {
        console.error('Error recalling message:', error);
        showNotification('Lỗi khi thu hồi tin nhắn', 'error');
    }
}

// Utility Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchAuthForm(formType) {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`${formType}Form`).classList.add('active');
    
    document.querySelectorAll('.modal .tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-form="${formType}"]`).classList.add('active');
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(price);
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    alert(message);
    // TODO: Implement better notification system
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions available globally
window.logout = logout;
window.viewProduct = viewProduct;
window.openOrderModal = openOrderModal;
window.contactSeller = contactSeller;
window.updateOrderStatus = updateOrderStatus;
window.cancelOrder = cancelOrder;
window.contactAboutOrder = contactAboutOrder;
