// Dashboard client logic - requires user authentication
const userMenu = document.getElementById('userMenu');

function getToken(){ return localStorage.getItem('token'); }

async function api(path, options = {}){
  const t = getToken();
  const headers = options.headers || {};
  headers['Content-Type'] = 'application/json';
  if(t) headers['Authorization'] = 'Bearer ' + t;
  const res = await fetch(path, {...options, headers});
  if(res.status === 401){
    // not authenticated, redirect to home so user can login
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  return res.json();
}

async function loadProfile(){
  const el = document.getElementById('profileCard');
  try{
    el.textContent = 'Đang tải...';
    const res = await api('/api/users/profile');
    if(res.success){
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h3>${res.user.name}</h3>
            <p>${res.user.email}</p>
            <p>${res.user.phone || ''}</p>
          </div>
          <div>
            <button class="btn btn-outline" id="logoutBtn">Đăng xuất</button>
          </div>
        </div>
      `;
      document.getElementById('logoutBtn').addEventListener('click', ()=>{ localStorage.removeItem('token'); localStorage.removeItem('adminToken'); window.location.href = '/'; });
    } else {
      el.textContent = 'Không thể tải thông tin';
    }
  }catch(err){ el.textContent = 'Lỗi tải profile'; }
}

async function loadOrders(){
  const el = document.getElementById('ordersList');
  try{
    el.textContent = 'Đang tải...';
    const res = await api('/api/orders?type=buyer');
    if(res.success){
      if(res.orders.length === 0) return el.innerHTML = '<p>Chưa có đơn hàng nào</p>';
      el.innerHTML = res.orders.map(o=>`<div class="order-card"><div><strong>${o.orderNumber}</strong> - ${o.status}</div><div>Tổng: ${o.finalPrice}</div></div>`).join('');
    } else {
      el.textContent = 'Không thể tải đơn hàng';
    }
  }catch(err){ el.textContent = 'Lỗi tải đơn hàng'; }
}

// Tab handling
function switchTab(tab){
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelector(`.tabs .tab[data-tab="${tab}"]`).classList.add('active');
  if(tab === 'profile') document.getElementById('profileSection').classList.add('active');
  if(tab === 'orders') { document.getElementById('myOrders').classList.add('active'); loadOrders(); }
  if(tab === 'products') { document.getElementById('myProducts').classList.add('active'); loadProducts(); }
}

document.querySelectorAll('.tabs .tab').forEach(t=> t.addEventListener('click', (e)=> switchTab(e.target.dataset.tab)));

document.getElementById('addProductBtnDashboard').addEventListener('click', ()=>{
  // reuse add product modal from main app (if present)
  const modal = document.getElementById('addProductModal');
  if(modal){ modal.classList.add('active'); }
  else { window.location.href = '/'; }
});

// Load products for logged in seller
async function loadProducts(){
  const el = document.getElementById('productsList');
  try{
    el.textContent = 'Đang tải...';
    const profileRes = await api('/api/users/profile');
    if(!profileRes.success) return el.textContent = 'Không thể tải sản phẩm';
    const userId = profileRes.user._id;
    const res = await api(`/api/products/seller/${userId}`);
    if(res.success){
      if(!res.products || res.products.length === 0) return el.innerHTML = '<div class="dashboard-empty"><p>Chưa có sản phẩm nào</p></div>';
      el.innerHTML = `<div class="dashboard-products">` + res.products.map(p=>`
        <div class="dashboard-product-card">
          <div style="display:flex;gap:12px;align-items:center">
            <img src="${p.images && p.images[0] ? '/' + p.images[0] : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22140%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22240%22 height=%22140%22/%3E%3C/text%3E%3C/svg%3E'}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:8px;background:#f3f4f6">
            <div>
              <strong>${p.title}</strong>
              <div class="meta">${p.category || ''} — ${p.price} ₫</div>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <a href="/" class="btn btn-outline">Sửa</a>
            <button class="btn" data-id="${p._id}" onclick="deleteProduct(event)">Xóa</button>
          </div>
        </div>
      `).join('') + `</div>`;
    } else {
      el.textContent = 'Không thể tải sản phẩm';
    }
  }catch(err){ el.textContent = 'Lỗi tải sản phẩm'; }
}

window.deleteProduct = async function(ev){
  const id = ev.target.dataset.id;
  if(!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
  try{
    await api(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }catch(err){ alert('Không thể xóa sản phẩm'); }
}

// Initialize dashboard
(async ()=>{
  if(!getToken()){ window.location.href = '/'; return; }
  await loadProfile();
  // Default to profile tab
  switchTab('profile');
})();