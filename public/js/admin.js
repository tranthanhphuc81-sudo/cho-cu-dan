/* Minimal admin UI JS */
const authArea = document.getElementById('auth-area');
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const dashboard = document.getElementById('dashboard');
const tabUsers = document.getElementById('tab-users');
const tabOrders = document.getElementById('tab-orders');
const panelUsers = document.getElementById('panel-users');
const panelOrders = document.getElementById('panel-orders');
const usersTableBody = document.querySelector('#users-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');

function getToken(){ return localStorage.getItem('adminToken') || localStorage.getItem('token'); }
function setToken(t){ localStorage.setItem('adminToken', t); localStorage.setItem('token', t); }
function clearToken(){ localStorage.removeItem('adminToken'); localStorage.removeItem('token'); }

async function setAuthUI(){
  const token = getToken();
  const userMenu = document.getElementById('userMenu');

  // Fallback: if no dedicated userMenu, keep old authArea behavior
  if(!userMenu){
    authArea.innerHTML = token ? '<button id="logoutBtn">Logout</button>' : '';
    if(token){document.getElementById('logoutBtn').addEventListener('click', ()=>{clearToken(); location.reload();});}
    return;
  }

  if(!token){
    userMenu.innerHTML = '<button class="btn btn-primary" id="loginBtn"><i class="fas fa-sign-in-alt"></i> Đăng nhập</button>';
    const btn = document.getElementById('loginBtn');
    if(btn) btn.addEventListener('click', ()=>{ loginSection.style.display = 'block'; });
    authArea.innerHTML = '';
    return;
  }

  // If token exists, try to fetch profile to show name
  try{
    const res = await api('/api/users/profile');
    if(res && res.success){
      userMenu.innerHTML = `
        <div class="user-info">
          <span>Xin chào, ${res.user.name}</span>
          <a href="/admin.html" class="btn btn-outline">Admin</a>
          <button class="btn btn-outline" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
        </div>
      `;
      document.getElementById('logoutBtn').addEventListener('click', ()=>{ clearToken(); location.href = '/'; });
      authArea.innerHTML = '';
      return;
    }
  }catch(err){
    console.error('Không thể tải profile:', err);
  }

  // If profile fetch failed, show login button as fallback
  userMenu.innerHTML = '<button class="btn btn-primary" id="loginBtn"><i class="fas fa-sign-in-alt"></i> Đăng nhập</button>';
  const fallbackBtn = document.getElementById('loginBtn');
  if(fallbackBtn) fallbackBtn.addEventListener('click', ()=>{ loginSection.style.display = 'block'; });
  authArea.innerHTML = '';
}

async function api(path, options={}){
  const t = getToken();
  const headers = options.headers || {};
  headers['Content-Type'] = 'application/json';
  if(t) headers['Authorization'] = 'Bearer ' + t;
  const res = await fetch(path, {...options, headers});
  if(res.status===401 || res.status===403){
    loginMessage.textContent = 'Unauthorized. Please login as admin.';
    throw new Error('Unauthorized');
  }
  return res.json();
}

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginMessage.textContent='';
  const fd = new FormData(loginForm);
  const body = {email: fd.get('email'), password: fd.get('password')};
  try{
    const res = await fetch('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await res.json();
    if(!data.success){loginMessage.textContent = data.message || 'Login failed'; return;}
    setToken(data.token);
    setAuthUI();
    showDashboard();
  }catch(err){loginMessage.textContent = 'Lỗi khi đăng nhập';}
});

function showDashboard(){
  loginSection.style.display='none';
  dashboard.style.display='block';
  loadUsers();
  loadOrders();
}

tabUsers.addEventListener('click', ()=>{tabUsers.classList.add('active');tabOrders.classList.remove('active');panelUsers.style.display='block';panelOrders.style.display='none';});
tabOrders.addEventListener('click', ()=>{tabOrders.classList.add('active');tabUsers.classList.remove('active');panelOrders.style.display='block';panelUsers.style.display='none';});

async function loadUsers(){
  usersTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try{
    const data = await api('/api/users');
    if(!data.success){usersTableBody.innerHTML = '<tr><td colspan="5">Error</td></tr>'; return;}
    usersTableBody.innerHTML = '';
    data.users.forEach(u=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.name || ''}</td>
        <td>${u.email || ''}</td>
        <td><select data-id="${u._id}" class="role-select"><option value="buyer">buyer</option><option value="seller">seller</option><option value="both">both</option><option value="admin">admin</option></select></td>
        <td>${u.isVerified ? '✓' : ''}</td>
        <td>
          <button class="btn-verify" data-id="${u._id}">${u.isVerified ? 'Unverify' : 'Verify'}</button>
          <button class="btn-delete" data-id="${u._id}">Delete</button>
        </td>
      `;
      const sel = tr.querySelector('.role-select'); sel.value = u.role || 'both';
      sel.addEventListener('change', async (e)=>{
        try{
          const id = e.target.dataset.id;
          await api(`/api/users/${id}/role`, {method:'PUT', body:JSON.stringify({role:e.target.value})});
          loadUsers();
        }catch(err){console.error(err)}
      });

      tr.querySelector('.btn-verify').addEventListener('click', async (ev)=>{
        const id = ev.target.dataset.id;
        try{await api(`/api/users/${id}/verify`, {method:'PUT', body:JSON.stringify({verified: true})}); loadUsers();}catch(err){console.error(err)}
      });

      tr.querySelector('.btn-delete').addEventListener('click', async (ev)=>{
        if(!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
        const id = ev.target.dataset.id;
        try{await api(`/api/users/${id}`, {method:'DELETE'}); loadUsers();}catch(err){console.error(err)}
      });

      usersTableBody.appendChild(tr);
    });
  }catch(err){usersTableBody.innerHTML = '<tr><td colspan="5">Không thể tải users</td></tr>'}
}

async function loadOrders(){
  ordersTableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try{
    const data = await api('/api/orders/all');
    if(!data.success){ordersTableBody.innerHTML = '<tr><td colspan="6">Error</td></tr>'; return;}
    ordersTableBody.innerHTML = '';
    data.orders.forEach(o=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.orderNumber}</td>
        <td>${o.buyer?.name || ''}</td>
        <td>${o.seller?.name || ''}</td>
        <td>${o.status}</td>
        <td>${o.finalPrice}</td>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
      `;
      ordersTableBody.appendChild(tr);
    });
  }catch(err){ordersTableBody.innerHTML = '<tr><td colspan="6">Không thể tải orders</td></tr>'}
}

// Init
setAuthUI();
if(getToken()){showDashboard();}