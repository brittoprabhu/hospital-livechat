import { connectAgentSocket } from './socket.js';

let token=null, socket=null, currentChatId=null;

const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const deptSel = document.getElementById('department');
const btnLogin = document.getElementById('btnLogin');
const loginMsg = document.getElementById('loginMsg');

const statusHeader = document.getElementById('status');
const pendingDiv = document.getElementById('pending');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const sendFileBtn = document.getElementById('sendFileBtn');
const closeBtn = document.getElementById('closeBtn');

// depts
fetch('/api/departments').then(r=>r.json()).then(d=>{
  const list=(d.departments&&d.departments.length)?d.departments:['Eye','Cardiology','Orthopedics','ENT','Neurology','General'];
  list.forEach(dep=>{ const o=document.createElement('option'); o.value=o.textContent=dep; deptSel.appendChild(o); });
});

btnLogin.onclick = async ()=>{
  loginMsg.textContent='';
  try{
    const res = await fetch('/api/agents/login',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: emailEl.value.trim(), password: passwordEl.value })
    });
    const j = await res.json();
    if(!res.ok || !j.token){ loginMsg.textContent=j.error||'Login failed'; return; }
    token = j.token;

    statusHeader.textContent='Logged in. Connecting…';
    socket = connectAgentSocket(token, deptSel.value);

    socket.on('agent:registered', ({ department })=>{
      statusHeader.textContent = `Online in ${department}`;
    });
    socket.on('agent:pending_list', renderPending);
    socket.on('agent:accept_failed', ({ reason })=> alert('Accept failed: '+reason));

    socket.on('chat:assigned', ({ chatId })=>{
      currentChatId = chatId;
      toggleChatControls(true);
      statusHeader.textContent='Chat active';
      messagesDiv.innerHTML='';
      socket.emit('chat:history_request', { chatId });
    });

    socket.on('chat:history', ({ chatId:id, items })=>{
      if(id!==currentChatId) return;
      for(const m of items){
        if(m.url) addFileBubble('agent', m.url, m.name, m.agentName||'Agent', m.at);
        else if(m.text) addTextBubble(m.from, m.text, m.agentName || (m.from==='patient'?'Patient':'Agent'), m.at);
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    socket.on('chat:message', (m)=>{
      if(m.from==='agent') return;
      addTextBubble('patient', m.text, 'Patient', m.at);
    });
    socket.on('chat:file', (m)=>{
      const who = m.from==='agent'?'Agent':'Patient';
      addFileBubble(m.from, m.url, m.name, who, m.at);
    });
    socket.on('chat:closed', ()=>{
      toggleChatControls(false);
      statusHeader.textContent='Chat closed';
    });

  }catch(e){ loginMsg.textContent='Network error'; }
};

function renderPending(items){
  pendingDiv.innerHTML = '';
  if(!items.length){ pendingDiv.innerHTML = '<div class="text-gray-500">No pending chats</div>'; return; }
  items.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
  for(const it of items){
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between border border-gray-200 rounded-md p-3 mb-2';
    row.innerHTML = `<div><div class="font-medium">${it.patientName || 'Patient'}</div>
      <div class="text-xs text-gray-500">${new Date(it.createdAt).toLocaleString()}</div></div>`;
    const btn = document.createElement('button');
    btn.className = 'rounded-md bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 text-sm';
    btn.textContent = 'Accept';
    btn.onclick = ()=> socket.emit('agent:accept', { chatId: it.id });
    row.appendChild(btn);
    pendingDiv.appendChild(row);
  }
}

sendBtn.onclick = ()=>{
  const text = msgInput.value.trim();
  if(!text || !currentChatId) return;
  socket.emit('agent:message', { chatId: currentChatId, text });
  addTextBubble('agent', text, 'You', new Date().toISOString());
  msgInput.value='';
};

sendFileBtn.onclick = async ()=>{
  if(!currentChatId || !fileInput.files.length) return;
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const resp = await fetch(`/api/upload/${currentChatId}`, { method:'POST', body: fd });
  const j = await resp.json();
  if(j.url){
    socket.emit('agent:file_uploaded', { chatId: currentChatId, url: j.url, name: fileInput.files[0].name });
    addFileBubble('agent', j.url, fileInput.files[0].name, 'You', new Date().toISOString());
    fileInput.value='';
  }
};

closeBtn.onclick = ()=>{
  if(!currentChatId) return;
  socket.emit('chat:close', { chatId: currentChatId });
  toggleChatControls(false);
  statusHeader.textContent='Chat closed';
};

function toggleChatControls(enabled){
  msgInput.disabled = !enabled; sendBtn.disabled = !enabled;
  fileInput.disabled = !enabled; sendFileBtn.disabled = !enabled;
  closeBtn.disabled = !enabled;
}

function addTextBubble(from, text, who, at){
  const wrap = document.createElement('div');
  wrap.className = 'w-full flex ' + (from==='agent'?'justify-start':'justify-end');
  const bub = document.createElement('div');
  bub.className = 'max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ' + (from==='agent'?'bg-gray-100':'bg-brand-600 text-white');
  bub.innerHTML = `<div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>${(text||'').replace(/</g,'&lt;')}`;
  wrap.appendChild(bub); messagesDiv.appendChild(wrap); messagesDiv.scrollTop=messagesDiv.scrollHeight;
}
function addFileBubble(from, url, name, who, at){
  const wrap = document.createElement('div');
  wrap.className = 'w-full flex ' + (from==='agent'?'justify-start':'justify-end');
  wrap.innerHTML = `<div class="max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${from==='agent'?'bg-gray-100':'bg-brand-600 text-white'}">
    <div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>
    <a class="underline" href="${url}" target="_blank">${name || 'file'}</a>
  </div>`;
  messagesDiv.appendChild(wrap); messagesDiv.scrollTop=messagesDiv.scrollHeight;
}
