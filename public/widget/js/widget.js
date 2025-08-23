import { connectWidgetSocket } from './socket.js';

const socket = connectWidgetSocket();
let chatId = null;

// DOM elements
const deptSel = document.getElementById('department');
const startChatBtn = document.getElementById('startChatBtn');
const patientNameInput = document.getElementById('patientName');
const chatSection = document.getElementById('chatSection');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const infoPanel = document.getElementById('infoPanel');
const fileForm = document.getElementById('fileForm');
const fileInput = document.getElementById('fileInput');

// Quick contacts
let QUICK = null;
fetch('/api/quick-contacts').then(r => r.json()).then(j => QUICK = j);

// Start chat (validate name)
startChatBtn.onclick = () => {
  const patientName = patientNameInput.value.trim();
  if (!patientName) {
    alert("Please enter your name to start chatting.");
    return;
  }

  console.log('[Chat] Starting new conversation as:', patientName);
  socket.emit('patient:new_conversation', { patientName });

  // UI updates
  patientNameInput.disabled = true;
  startChatBtn.disabled = true;

  if (chatSection) {
    chatSection.classList.remove('hidden');
  } else {
    console.warn('[UI] Chat section element not found.');
  }
};

// After chat is created
socket.on('patient:created', async ({ chatId: id }) => {
  chatId = id;

  //addText('bot', '👋 Hello! Welcome to ABC Hospital. How can I help you today?', 'Bot', new Date().toISOString());

  msgInput.disabled = false;
  sendBtn.disabled = false;
  fileForm.classList.remove('hidden');
  msgInput.focus();

  socket.emit('chat:history_request', { chatId });

  const res = await fetch('/api/faqs/top');
  const faqs = await res.json();
  if (faqs?.length) renderSuggestions(faqs);
    // 👇👇 Call department selection UI here
  showDepartmentSelection();

});

// Agent assigned
socket.on('chat:assigned', ({ agentName }) => {
  addText('agent', `Connected with ${agentName}`, 'System', new Date().toISOString());
});

// Load chat history
socket.on('chat:history', ({ chatId: id, items }) => {
  if (id !== chatId) return;
  for (const m of items) {
    if (m.url) addFile(m.from, m.url, m.name, m.agentName || (m.from === 'patient' ? 'You' : 'Agent'), m.at);
    else if (m.text) addText(m.from, m.text, m.agentName || (m.from === 'patient' ? 'You' : 'Agent'), m.at);
  }
  scrollToBottom();
});

// Bot reply with suggestions
socket.on('bot_reply', (msg) => {
  addText('bot', msg.text, 'Bot', new Date().toISOString());

  if (msg.suggestions?.length) {
    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-2 mt-2';
    msg.suggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.textContent = s.question;
      btn.className = 'px-3 py-1 text-sm border rounded-full hover:bg-gray-100';
      btn.onclick = () => {
        msgInput.value = s.question;
        sendBtn.click();
      };
      container.appendChild(btn);
    });
    const wrap = document.createElement('div');
    wrap.className = 'w-full flex justify-start';
    wrap.appendChild(container);
    messagesDiv.appendChild(wrap);
    scrollToBottom();
  }
});

// Escalation
socket.on('escalate_to_agent', (msg) => {
  if (msg?.text) {
    addText('agent', msg.text, 'Bot', new Date().toISOString());
  }
});

// Send patient message
sendBtn.onclick = () => {
  const text = msgInput.value.trim();
  if (!text || !chatId) return;
  socket.emit('patient:message', { chatId, text });
  addText('patient', text, 'You', new Date().toISOString());
  msgInput.value = '';
};

// Handle file upload
fileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!chatId || !fileInput.files.length) return;
  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  const resp = await fetch(`/api/upload/${chatId}`, { method: 'POST', body: fd });
  const j = await resp.json();
  if (j.url) {
    addFile('patient', j.url, fileInput.files[0].name, 'You', new Date().toISOString());
    fileInput.value = '';
  }
});

// General message handler
socket.on('chat:message', renderIncomingMessage);
socket.on('bot:message', renderIncomingMessage);

async function showDepartmentSelection() {
  const res = await fetch('/api/departments');
  const result = await res.json();

  console.log('Departments API result:', result);

  const departments = result.departments; // Extract array from wrapper object

  if (!Array.isArray(departments)) {
    console.error('Departments data is not an array:', departments);
    return;
  }

  // Normalize department objects and include online counts
  const departmentObjects = departments.map((d, index) => ({
    name: d.name,
    online: d.online || 0,
    order: d.order ?? index
  }));

  // Sort by order (if null, push to end)
  departmentObjects.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  const container = document.createElement('div');
  container.className = 'space-y-2';

  const firstThree = departmentObjects.slice(0, 3);
  const remaining = departmentObjects.slice(3);

  const list = document.createElement('div');
  list.className = 'grid grid-cols-2 gap-2';

  firstThree.forEach(dep => {
    const btn = document.createElement('button');
    btn.className = 'px-3 py-2 rounded-lg bg-white border border-gray-300 hover:border-brand-600 text-sm';
    btn.textContent = `${dep.name} (${dep.online} online)`;
    btn.onclick = () => selectDepartment(dep.name);
    list.appendChild(btn);
  });

  container.appendChild(list);

  if (remaining.length > 0) {
    const moreBtn = document.createElement('button');
    moreBtn.textContent = 'More';
    moreBtn.className = 'text-sm text-brand-600 underline';
    moreBtn.onclick = () => {
      remaining.forEach(dep => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-2 rounded-lg bg-white border border-gray-300 hover:border-brand-600 text-sm mt-1';
        btn.textContent = `${dep.name} (${dep.online} online)`;
        btn.onclick = () => selectDepartment(dep.name);
        list.appendChild(btn);
      });
      moreBtn.remove();
    };
    container.appendChild(moreBtn);
  }

  messagesDiv.appendChild(container);
  scrollToBottom();
}


function selectDepartment(dept) {
  socket.emit('patient:set_department', { chatId, department: dept });
  addText('bot', `You've selected **${dept}** department. Please continue with your question.`, 'Bot', new Date().toISOString());
}

function renderIncomingMessage(m) {
  if (m.from === 'patient') return;
  const from = m.source === 'faq' || m.source === 'bot' ? 'bot' : 'agent';
  const sender = m.source === 'faq' || m.source === 'bot' ? 'Bot' : (m.agentName || 'Agent');
  addText(from, m.text, sender, m.at);
}

// File
socket.on('chat:file', (m) => {
  const who = m.from === 'patient' ? 'You' : (m.agentName || 'Agent');
  addFile(m.from, m.url, m.name, who, m.at);
});

// Chat closed
socket.on('chat:closed', () => {
  msgInput.disabled = true;
  sendBtn.disabled = true;
});

socket.on('chat:forwarded', ({ department }) => {
  addText('bot', `Your chat has been forwarded to ${department}. Please wait for an agent.`, 'System', new Date().toISOString());
});

// Render FAQ suggestions
function renderSuggestions(suggestions) {
  const container = document.createElement('div');
  container.className = 'flex flex-wrap gap-2 mt-2 mb-4';
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'bg-white border border-gray-300 rounded-full px-3 py-1 text-sm hover:bg-gray-100';
    btn.textContent = s.question;
    btn.onclick = () => {
      msgInput.value = s.question;
      sendBtn.click();
    };
    container.appendChild(btn);
  });
  messagesDiv.appendChild(container);
  scrollToBottom();
}

// Utility: Add chat bubble
function addBubble(from, html) {
  const wrap = document.createElement('div');
  const isYou = from === 'patient';
  const isBot = from === 'bot';
  wrap.className = 'w-full flex ' + (isYou ? 'justify-end' : 'justify-start');

  const bubble = document.createElement('div');
  bubble.className = 'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm';

  if (isYou) {
    bubble.classList.add('bg-brand-600', 'text-white');
  } else if (isBot) {
    bubble.classList.add('bg-blue-100', 'text-blue-900', 'border', 'border-blue-300');
  } else {
    bubble.classList.add('bg-gray-100', 'text-gray-900');
  }

  bubble.innerHTML = html;
  wrap.appendChild(bubble);
  messagesDiv.appendChild(wrap);
  scrollToBottom();
}

// Utility: Text message
function addText(from, text, who, at) {
  const header = `<div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>`;
  addBubble(from, header + `<div>${(text || '').replace(/</g, '&lt;')}</div>`);
}

// Utility: File message
function addFile(from, url, name, who, at) {
  const header = `<div class="opacity-70 text-[11px] mb-0.5">${new Date(at).toLocaleTimeString()} • ${who}</div>`;
  addBubble(from, header + `<a class="underline" target="_blank" href="${url}">${name || 'file'}</a>`);
}

// Scroll chat to bottom
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
