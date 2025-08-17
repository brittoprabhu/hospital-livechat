document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');

  msg.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username, password })
    });
    const j = await res.json();
    if (!res.ok || !j.token) {
      msg.textContent = j.error || 'Invalid credentials';
      return;
    }
    localStorage.setItem('adminToken', j.token);
    location.href = '/admin/dashboard.html';
  } catch (err) {
    msg.textContent = 'Network error';
  }
});
