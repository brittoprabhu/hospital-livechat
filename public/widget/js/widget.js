import { connectWidgetSocket } from './socket.js';

const socket = connectWidgetSocket();
let chatId = null;

const deptSel = document.getElementById('department');
const startChatBtn = document.getElementById('startChatBtn');
const patientNameInput = document.getElementById('patientName');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const infoPanel = document.getElementById('infoPanel');
const otherService = document.getElementById('otherService');
const fileForm = document.getElementById('fileForm');
const fileInput = document.getElementById('fileInput');

// Departments
fetch('/api/departments').then(r => r.json()).then(d => {
  (d.departments || []).forEach(dep => {
    const opt = document.createElement('option'); opt.value=opt.textContent=dep; deptSel.appendChild(opt);
  });
});

// Quick contacts
let QUICK = null;
fetch('/api/quick-contacts').then(r=>r.json()).then(j=> QUICK=j);

// Quick actions
document.getElementById('btnAppointment').onclick = ()=>{
  revealInfo(`<strong>Appointment Booking:</strong> <span class="font-mono">${QUICK ? QUICK.appointmentNumber : 'Loading...'}</span>`);
};
document.getElementById('btnAmbulance').onclick = ()=>{
  revealInfo(`<strong>Ambulance:</strong> <span class="font-mono">${QUICK ? QUICK.ambulanceNumber : 'Loading...'}</span>`);
};
document.getElementById('btnLab').onclick = ()=>{
  revealInfo(`<strong>Lab Service:</strong> <span class="font-mono">${QUICK ? QUICK.labNumber : 'Loading...'}</span>`);
};
document.getElementById('btnOther').onclick = ()=>{
  otherService.classList.remove('hidden'); scrollToBottom();
};
function revealInfo(html){ infoPanel.classList.remove('hidden'); infoPanel.innerHTML=html; scrollToBottom(); }

startChatBtn.onclick = ()=>{
  const department = deptSel.value;
  const patientName = patientNameInput.value;
  socket.emit('patient:new_conversation', { department, patientName });
};

socket.on('patient:created', ({ chatId:id })=>{
  chatId = id;
  addText('agent', 'Thanks for contacting ABC Hospital. An agent will join shortly.', 'System', new Date().toISOString());
  msgInput.disabled=false; sendBtn.disabled=false; fileForm.classList.remove('hidden');
  socket.emit('chat:history_request', { chatId });
});

socket.on('chat:assigned', ({ agentName })=>{
  addText('agent', `Connected with ${agentName}`, 'System', new Date().toISOString());
});

socket.on('chat:history', ({ chatId:id, items })=>{
  if(id!==chatId) return;
  for(const m of items){
    if(m.url) addFile(m.from, m.url, m.name, m.agentName || (m.from==='patient'?'You':'Agent'), m.at);
    else if(m.text) addText(m.from, m.text, m.agentName || (m.from==='patient'?'You':'Agent'), m.at);
  }
  scrollToBottom();
});

sendBtn.onclick = ()=>{
  const text = msgInput.value.trim();
  if(!text || !chatId) return;
  socket.emit('patient:message',{ chatId, text });
  addText('patient', text, 'You', new Date().toISOString());
  msgInput.value='';
};

fileForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!chatId || !fileInput.files.length) return;
  const fd = new FormData(); fd.append('file', fileInput.files[0]);
  const resp = await fetch(`/api/upload/${chatId}`, { method:'POST', body: fd });
  const j = await resp.json();
  if(j.url){
    addFile('patient', j.url, fileInput.files[0].name, 'You', new Date().toISOString());
    fileInput.value='';
  }
});

socket.on('chat:message', (m)=>{
  if(m.from==='patient') return;
  addText('agent', m.text, m.agentName || 'Agent', m.at);
});
socket.on('chat:file', (m)=>{
  const who = m.from==='patient' ? 'You' : (m.agentName || 'Agent');
  addFile(m.from, m.url, m.name, who, m.at);
});
socket.on('chat:closed', ()=>{
  msgInput.disabled=true; sendBtn.disabled=true;
});

function addBubble(from, html){
  const wrap = document.createElement('div');
  const isYou = from==='patient';
  wrap.className = 'w-full flex ' + (isYou?'justify-end':'justify-start');
  const bubble = document.createElement('div');
  bubble.className = 'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ' + (isYou?'bg-brand-600 text-white':'bg-gray-100 text-gray-900');
  bubble.innerHTML = html; wrap.appendChild(bubble); messagesDiv.appendChild(wrap);
  scrollToBottom();
}
function addText(from, text, who, at){
  const header = `<div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>`;
  addBubble(from, header + `<div>${(text||'').replace(/</g,'&lt;')}</div>`);
}
function addFile(from, url, name, who, at){
  const header = `<div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>`;
  addBubble(from, header + `<a class="underline" target="_blank" href="${url}">${name || 'file'}</a>`);
}
function scrollToBottom(){ messagesDiv.scrollTop = messagesDiv.scrollHeight; }
