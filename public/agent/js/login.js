const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const deptInput = document.getElementById('department');
const btnLogin = document.getElementById('btnLogin');
const loginMsg = document.getElementById('loginMsg');

emailEl.addEventListener('blur', async () => {
  const email = emailEl.value.trim();
  deptInput.value = '';
  if (!email) return;
  try {
    const res = await fetch(`/api/agents/department?email=${encodeURIComponent(email)}`);
    const j = await res.json();
    if (res.ok && j.department) deptInput.value = j.department;
  } catch (e) {
    console.error('department lookup failed', e);
  }
});

btnLogin.onclick = async ()=>{
  loginMsg.textContent = '';
  try {
    const res = await fetch('/api/agents/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: emailEl.value.trim(), password: passwordEl.value })
    });
    const j = await res.json();
    if(!res.ok || !j.token){ loginMsg.textContent = j.error || 'Login failed'; return; }
    localStorage.setItem('agentToken', j.token);
    localStorage.setItem('agentDepartment', j.department);
    location.href = 'home.html';
  } catch(e){
    loginMsg.textContent = 'Network error';
  }
};
