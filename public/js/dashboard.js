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

// Initialize dashboard
(async ()=>{
  if(!getToken()){ window.location.href = '/'; return; }
  await loadProfile();
  await loadOrders();
})();