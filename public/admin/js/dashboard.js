// Guard
const token = localStorage.getItem('adminToken');
if (!token) location.href = '/admin/login.html';

import { connectAdminSocket } from './socket.js';

document.getElementById('btnLogout').onclick = ()=>{
  localStorage.removeItem('adminToken');
  location.href = '/admin/login.html';
};
document.getElementById('btnRefresh').onclick = ()=> loadOverview();
document.getElementById('btnExport').onclick = exportCsv;
document.getElementById('btnSendInvite').onclick = sendInvitation;

document.getElementById('whoami').textContent = 'Connected with admin token';

// socket live presence
const socket = connectAdminSocket(token, (rows)=> renderAgents(rows));

window.addEventListener('DOMContentLoaded', async ()=>{
  await loadDepartments();
  await loadOverview();
});

async function loadDepartments() {
  try {
    const res = await fetch('/api/departments', { cache:'no-store' });
    const j = await res.json();
    const sel = document.getElementById('inviteDept');
    sel.innerHTML = '<option value="">Select department</option>';
    const list = (j.departments && j.departments.length) ? j.departments
      : ['Eye','Cardiology','Orthopedics','ENT','Neurology','General'];
    list.forEach(d => {
      const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('departments error', e);
  }
}

async function loadOverview() {
  try {
    const res = await fetch('/api/admin/overview', { headers:{ Authorization: 'Bearer ' + token }});
    const j = await res.json();
    renderAgents(j.agents || []);
    renderChats(j.chats || []);
  } catch (e) { console.error('overview error', e); }
}

function renderAgents(agents) {
  const area = document.getElementById('agentsArea');
  if (!agents.length) { area.innerHTML = '<div class="text-gray-500">No agents</div>'; return; }
  let html = `<div class="overflow-x-auto"><table class="min-w-full text-sm">
    <thead><tr class="text-left text-gray-600">
      <th class="py-2 pr-4">ID</th>
      <th class="py-2 pr-4">Name</th>
      <th class="py-2 pr-4">Email</th>
      <th class="py-2 pr-4">Dept</th>
      <th class="py-2 pr-4">Status</th>
      <th class="py-2 pr-4">Last Seen</th>
      <th class="py-2 pr-4">Badges</th>
      <th class="py-2 pr-4">Action</th>
    </tr></thead><tbody class="divide-y divide-gray-100">`;

  for (const a of agents) {
    const cls = a.status === 'online'
      ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200'
      : (a.status === 'busy'
        ? 'text-amber-700 bg-amber-50 ring-1 ring-amber-200'
        : 'text-gray-600 bg-gray-50 ring-1 ring-gray-200');

    const approveDisabled = !!a.is_approved;
    const revokeDisabled = !a.is_approved;

    html += `<tr>
      <td class="py-2 pr-4">${a.id}</td>
      <td class="py-2 pr-4">${a.name || ''}</td>
      <td class="py-2 pr-4">${a.email || ''}</td>
      <td class="py-2 pr-4">${a.department || ''}</td>
      <td class="py-2 pr-4"><span class="px-2 py-0.5 rounded-md ${cls}">${a.status || 'offline'}</span></td>
      <td class="py-2 pr-4">${a.last_seen || ''}</td>
      <td class="py-2 pr-4">
        <div class="flex gap-1 flex-wrap">
          ${a.is_verified ? badge('Verified','emerald') : badge('Not Verified','gray')}
          ${a.is_approved ? badge('Approved','blue') : badge('Not Approved','red')}
        </div>
      </td>
      <td class="py-2 pr-4">
        <div class="flex items-center gap-2">
          <button class="px-2.5 py-1 text-xs rounded-md text-white ${approveDisabled?'bg-gray-300 cursor-not-allowed':'bg-emerald-600 hover:bg-emerald-700'}"
                  ${approveDisabled?'disabled':''}
                  onclick="setApproval(${a.id}, true)">Approve</button>
          <button class="px-2.5 py-1 text-xs rounded-md text-white ${revokeDisabled?'bg-gray-300 cursor-not-allowed':'bg-red-600 hover:bg-red-700'}"
                  ${revokeDisabled?'disabled':''}
                  onclick="setApproval(${a.id}, false)">Revoke</button>
        </div>
      </td>
    </tr>`;
  }
  html += '</tbody></table></div>';
  area.innerHTML = html;
}
window.setApproval = setApproval;

function badge(text, color) {
  const map = {
    emerald:'bg-emerald-100 text-emerald-800',
    gray:'bg-gray-200 text-gray-700',
    blue:'bg-blue-100 text-blue-800',
    red:'bg-red-100 text-red-700'
  };
  return `<span class="px-2 py-0.5 rounded-md text-xs ${map[color]}">${text}</span>`;
}

async function setApproval(agentId, approve) {
  try {
    const res = await fetch('/api/admin/agents/approve', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ agentId, approve })
    });
    const j = await res.json();
    if (!res.ok || !j.ok) return alert(j.error || 'Failed');
    await loadOverview(); // buttons toggle state after refresh
  } catch (e) { console.error('approve error', e); alert('Network error'); }
}

function renderChats(chats) {
  const area = document.getElementById('chatsArea');
  if (!chats.length) { area.innerHTML = '<div class="text-gray-500">No chats</div>'; return; }
  let html = `<div class="overflow-x-auto"><table class="min-w-full text-sm">
  <thead><tr class="text-left text-gray-600">
    <th class="py-2 pr-4">ChatId</th><th class="py-2 pr-4">Patient</th><th class="py-2 pr-4">Dept</th>
    <th class="py-2 pr-4">Agent</th><th class="py-2 pr-4">Status</th><th class="py-2 pr-4">Action</th>
  </tr></thead><tbody class="divide-y divide-gray-100">`;
  for (const c of chats) {
    html += `<tr>
      <td class="py-2 pr-4 font-mono">${c.id}</td>
      <td class="py-2 pr-4">${c.patientName || ''}</td>
      <td class="py-2 pr-4">${c.department}</td>
      <td class="py-2 pr-4">${c.assignedAgentId || ''}</td>
      <td class="py-2 pr-4">${c.status}</td>
      <td class="py-2 pr-4">
        <button class="rounded-md bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 text-xs"
          onclick="closeChat('${c.id}')">Close</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table></div>';
  area.innerHTML = html;
}
window.closeChat = async (chatId)=>{
  const res = await fetch('/api/admin/close_chat', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body: JSON.stringify({ chatId })
  });
  const j = await res.json();
  if (j.ok) loadOverview(); else alert(j.error || 'Failed');
};

async function exportCsv() {
  const from = document.getElementById('exportFrom').value;
  const to = document.getElementById('exportTo').value;
  const q = new URLSearchParams(); if (from) q.set('from', from); if (to) q.set('to', to);
  const res = await fetch('/api/admin/chats/export?'+q.toString(), { headers:{ Authorization:'Bearer '+token }});
  if (!res.ok) return alert('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'chat_transcripts.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

// invitation
async function sendInvitation() {
  const email = document.getElementById('inviteEmail').value.trim();
  const department = document.getElementById('inviteDept').value;
  const expiresInHours = Number(document.getElementById('inviteExpiry').value || 72);
  const msgEl = document.getElementById('inviteMsg');
  const btn = document.getElementById('btnSendInvite');
  if (!email || !department) {
    msgEl.textContent = 'Please enter email and select department';
    msgEl.className = 'text-sm mt-2 text-red-600';
    return;
  }
  try {
    btn.disabled = true; btn.textContent = 'Sending…';
    msgEl.textContent = '';
    const res = await fetch('/api/admin/invitations', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ email, department, expiresInHours })
    });
    const j = await res.json();
    if (!res.ok || j.error) {
      msgEl.textContent = 'Error: '+(j.error || 'Failed to create invitation');
      msgEl.className = 'text-sm mt-2 text-red-600';
      return;
    }
    const exp = j.expiresAt ? new Date(j.expiresAt).toLocaleString() : '';
    msgEl.innerHTML = `✅ Invitation created for <b>${email}</b> in <b>${department}</b>. ${exp?('Expires: '+exp):''}`;
    msgEl.className = 'text-sm mt-2 text-emerald-700';
    document.getElementById('inviteEmail').value = '';
  } catch (e) {
    msgEl.textContent = 'Network error';
    msgEl.className = 'text-sm mt-2 text-red-600';
  } finally {
    btn.disabled = false; btn.textContent = 'Send Invitation';
  }
}
