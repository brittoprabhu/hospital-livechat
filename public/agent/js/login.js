const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const deptSel = document.getElementById('department');
const btnLogin = document.getElementById('btnLogin');
const loginMsg = document.getElementById('loginMsg');

// populate departments
fetch('/api/departments').then(r=>r.json()).then(d=>{
  const list = (d.departments && d.departments.length)
    ? d.departments.map(dep => dep.name)
    : ['Eye','Cardiology','Orthopedics','ENT','Neurology','General'];
  list.forEach(dep => {
    const o = document.createElement('option');
    o.value = dep;
    o.textContent = dep;
    deptSel.appendChild(o);
  });
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
    localStorage.setItem('agentDepartment', deptSel.value);
    location.href = 'home.html';
  } catch(e){
    loginMsg.textContent = 'Network error';
  }
};
