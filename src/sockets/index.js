import crypto from 'crypto';
import { verifyToken } from '../middleware/auth.js';
import { loadDepartments } from '../config/index.js';
import { processBotMessage } from '../services/botservice.js'; 

export function socketHandlers(io, pool) {
  async function getPendingList(department) {
    const rows = await pool.query(
      `SELECT id, patient_name AS "patientName", created_at AS "createdAt", status
         FROM conversations
        WHERE department=$1 AND status='pending'
        ORDER BY created_at ASC`,
      [department]
    );
    return rows.rows;
  }

  async function setAgentStatus(agentId, status) {
    try { await pool.query('UPDATE agents SET status=$1, last_seen=NOW() WHERE id=$2', [status, agentId]); }
    catch (e) { console.error('setAgentStatus error', e); }
  }

  async function broadcastDepartmentCounts() {
    try {
      const { rows } = await pool.query(
        `SELECT d.name,
                d.order,
                COUNT(a.*) FILTER (WHERE a.status = 'online') AS online
           FROM departments d
           LEFT JOIN agents a ON a.department = d.name
          GROUP BY d.id
          ORDER BY d.order NULLS LAST, d.id`
      );
      io.to('agents').emit('agent:department_counts', rows);
    } catch (e) { console.error(e); }
  }

  async function broadcastAgentPresence() {
    try {
      const rows = await pool.query(
        'SELECT id, name, email, department, status, last_seen, is_verified, is_approved FROM agents'
      );
      const sockets = await io.fetchSockets();
      for (const s of sockets) {
        if (s.data?.role === 'admin_socket') s.emit('admin:agents', rows.rows);
      }
      await broadcastDepartmentCounts();
    } catch (e) { console.error(e); }
  }

  async function broadcastPending(department) {
    const items = await getPendingList(department);
    const room = `dept_${department}`;
    const sockets = await io.in(room).fetchSockets();
    if (sockets.length) {
      io.to(room).emit('agent:pending_list', items);
    } else {
      io.to('agents').emit('agent:pending_list', items);
    }
  }

  io.on('connection', (socket) => {
    // ADMIN socket: presence stream
    socket.on('admin:register', ({ token }) => {
      try {
        const payload = verifyToken(token);
        if (!payload || payload.role !== 'admin') return socket.emit('error', { message: 'Invalid admin token' });
        socket.data.role = 'admin_socket';
        socket.data.adminId = String(payload.id);
        (async () => { await broadcastAgentPresence(); })();
        socket.emit('admin:registered', { ok: true });
      } catch { socket.emit('error', { message: 'Admin auth failed' }); }
    });

    // PATIENT: new conversation
   // const crypto = require('crypto');

socket.on('patient:new_conversation', async ({ patientName }) => {
  try {
    const id = crypto.randomBytes(12).toString('hex');

    await pool.query(
      'INSERT INTO conversations (id, department, patient_name, assigned_agent_id, status) VALUES ($1, $2, $3, $4, $5)',
      [id, '', patientName || 'Guest', null, 'pending']
    );

    socket.join(`chat_${id}`);

    // Notify patient
    socket.emit('patient:created', { chatId: id, status: 'pending' });

    // Initial bot reply
    socket.emit('bot_reply', {
      text: `👋 Hello ${patientName || 'Guest'}! Welcome to ABC Hospital. How can I help you today?`,
      suggestions: [] // Optional: add default FAQs if needed
    });

    // (Optional) Notify agents that a new chat is pending
    // await broadcastPending(); // If you no longer need to notify agents, you can remove this

  } catch (e) {
    console.error('[Error in patient:new_conversation]', e);
  }
});

    // PATIENT: message
  socket.on('patient:set_department', async ({ chatId, department }) => {
  try {
    await pool.query(
      'UPDATE conversations SET department=$1, updated_at=NOW() WHERE id=$2',
      [department, chatId]
    );

    // Broadcast to agents in that department
    await broadcastPending(department);

    console.log(`[patient:set_department] Chat ${chatId} set to department ${department}`);
  } catch (e) {
    console.error('[ERROR] patient:set_department', e);
  }
});


  socket.on('patient:message', async ({ chatId, text }) => {
    try {
      const context = {}; // Optional: store session state here
      console.log(`[patient:message] chatId=${chatId}, text="${text}"`);

      await pool.query('INSERT INTO messages (chat_id, sender, text) VALUES ($1,$2,$3)', [chatId, 'patient', text]);

      io.to(`chat_${chatId}`).emit('chat:message', {
        chatId,
        from: 'patient',
        text,
        at: new Date().toISOString()
      });

      const escalate = async ({ department } = {}) => {
        let targetDept = department;
        if (!targetDept) {
          const res = await pool.query('SELECT department FROM conversations WHERE id=$1', [chatId]);
          targetDept = res.rows[0]?.department;
        }
        if (!targetDept) {
          const depts = await loadDepartments();
          targetDept = depts[0] || 'General';
        }
        await pool.query('UPDATE conversations SET department=$1, updated_at=NOW() WHERE id=$2', [targetDept, chatId]);
        await broadcastPending(targetDept);
      };

      await processBotMessage({ message: text, socket: io.to(`chat_${chatId}`), context, escalate });
    } catch (e) {
      console.error('[ERROR] patient:message handler:', e);
    }
  });

socket.on('bot_feedback', feedback => {
  if (!context.feedback) context.feedback = 0;
  context.feedback += feedback === 'down' ? -1 : 1;
});

    // History
    socket.on('chat:history_request', async ({ chatId }) => {
      try {
        const rows = await pool.query(
          'SELECT sender as "from", text, file_url as url, file_name as name, agent_name as "agentName", created_at as at FROM messages WHERE chat_id=$1 ORDER BY created_at ASC',
          [chatId]
        );
        socket.emit('chat:history', { chatId, items: rows.rows });
      } catch (e) { console.error(e); }
    });

    // AGENT: register online
    socket.on('agent:register', async ({ token, department }) => {
      try {
        const valid = await loadDepartments(); // ✅ Must await if async


if (!Array.isArray(valid)) {
  console.error('loadDepartments() did not return array:', valid);
}
        const payload = verifyToken(token);
        console.log(`[agent:register] Agent ${payload.id} joined dept_${department}`);
        if (!payload || payload.role !== 'agent') return socket.emit('error', { message: 'Invalid agent token' });
        if (!department || !valid.includes(department)) return socket.emit('error', { message: 'Invalid department' });
        
         socket.join('agents'); // 👈 Join global room
        socket.join(`dept_${department}`);
        socket.data.role = 'agent';
        socket.data.department = department;
        socket.data.agentId = String(payload.id);

        console.log(`✅ Agent [${department}] and global agent room`);
        socket.emit('agent:registered', { agentId: payload.id, department });

        await setAgentStatus(payload.id, 'online');
        await broadcastAgentPresence();

        const items = await getPendingList(department);
        socket.emit('agent:pending_list', items);
      } catch (e) { console.error(e); socket.emit('error', { message: 'Agent register failed' }); }
    });

    // AGENT: accept pending (atomic)
    socket.on('agent:accept', async ({ chatId }) => {
      try {
        const agentId = socket.data?.agentId;
        const department = socket.data?.department;
        console.log(`[agent:accept] Agent ${agentId} accepted chat ${chatId}`);

        if (!agentId || !department) return;

        const res = await pool.query(
          `UPDATE conversations
              SET assigned_agent_id=$1, status='active', updated_at=NOW()
            WHERE id=$2 AND department=$3 AND status='pending'
              AND (assigned_agent_id IS NULL OR assigned_agent_id=0)`,
          [agentId, chatId, department]
        );
        if (!res.rowCount) return socket.emit('agent:accept_failed', { reason: 'Already taken' });

        socket.join(`chat_${chatId}`);
        await setAgentStatus(agentId, 'busy');
        await broadcastAgentPresence();

        io.to(`chat_${chatId}`).emit('chat:assigned', { chatId, agentName: `Agent#${agentId}`, assignedAgentId: agentId });
        await broadcastPending(department);
      } catch (e) { console.error(e); socket.emit('agent:accept_failed', { reason: 'Server error' }); }
    });

    // AGENT: message
    socket.on('agent:message', async ({ chatId, text }) => {
      try {
        const agentId = socket.data?.agentId;
        if (!agentId) return;
        const rows = await pool.query('SELECT assigned_agent_id FROM conversations WHERE id=$1 LIMIT 1', [chatId]);
        if (!rows.rowCount || String(rows.rows[0].assigned_agent_id) !== String(agentId)) {
          return socket.emit('agent:accept_failed', { reason: 'Not assigned' });
        }
        await pool.query('INSERT INTO messages (chat_id, sender, text, agent_name) VALUES ($1,$2,$3,$4)',
          [chatId, 'agent', text, `Agent#${agentId}`]);
        io.to(`chat_${chatId}`).emit('chat:message', { chatId, from: 'agent', agentName: `Agent#${agentId}`, text, at: new Date().toISOString() });
      } catch (e) { console.error(e); }
    });

    // AGENT: file uploaded notification
    socket.on('agent:file_uploaded', async ({ chatId, url, name }) => {
      try {
        const agentId = socket.data?.agentId;
        if (!agentId) return;
        const rows = await pool.query('SELECT assigned_agent_id FROM conversations WHERE id=$1 LIMIT 1', [chatId]);
        if (!rows.rowCount || String(rows.rows[0].assigned_agent_id) !== String(agentId)) return;
        await pool.query('INSERT INTO messages (chat_id, sender, file_url, file_name, agent_name) VALUES ($1,$2,$3,$4,$5)',
          [chatId, 'agent', url, name, `Agent#${agentId}`]);
        io.to(`chat_${chatId}`).emit('chat:file', { chatId, from: 'agent', url, name, agentName: `Agent#${agentId}`, at: new Date().toISOString() });
      } catch (e) { console.error(e); }
    });

    // AGENT: forward chat to another department
    socket.on('agent:forward', async ({ chatId, department: targetDept }) => {
      try {
        const agentId = socket.data?.agentId;
        if (!agentId) return;
        const { rows } = await pool.query('SELECT department, assigned_agent_id FROM conversations WHERE id=$1 LIMIT 1', [chatId]);
        if (!rows.length || String(rows[0].assigned_agent_id) !== String(agentId)) {
          return socket.emit('agent:forward_failed', { reason: 'Not assigned' });
        }
        const fromDept = rows[0].department;
        await pool.query(`UPDATE conversations SET department=$1, status='pending', assigned_agent_id=NULL, updated_at=NOW() WHERE id=$2`, [targetDept, chatId]);
        socket.leave(`chat_${chatId}`);
        await setAgentStatus(agentId, 'online');
        await broadcastAgentPresence();
        await broadcastPending(targetDept);
        io.to(`chat_${chatId}`).emit('chat:forwarded', { chatId, department: targetDept });
        socket.emit('agent:forwarded', { chatId, department: targetDept });
        // refresh pending list of original department if needed
        if (fromDept && fromDept !== targetDept) await broadcastPending(fromDept);
      } catch (e) {
        console.error(e);
        socket.emit('agent:forward_failed', { reason: 'Server error' });
      }
    });

    socket.on('chat:close', async ({ chatId }) => {
      try {
        await pool.query(`UPDATE conversations SET status='closed', updated_at=NOW() WHERE id=$1`, [chatId]);
        io.to(`chat_${chatId}`).emit('chat:closed', { chatId });
      } catch (e) { console.error(e); }
    });

    socket.on('disconnect', async () => {
      try {
        if (socket.data?.role === 'agent' && socket.data.agentId) {
          await setAgentStatus(socket.data.agentId, 'offline');
          await broadcastAgentPresence();
        }
      } catch (e) { console.error(e); }
    });
  });


  
}
// ... your existing code
export function makeBroadcastHelpers(io, pool) {
  async function getPendingList(department) {
    const { rows } = await pool.query(
      `SELECT id, patient_name AS "patientName", created_at AS "createdAt", status
         FROM conversations
        WHERE department = $1 AND status = 'pending'
        ORDER BY created_at ASC`,
      [department]
    );
    return rows;
  }

  async function broadcastAgentPresence() {
    const { rows } = await pool.query(
      `SELECT id, name, email, department, status, last_seen, is_verified, is_approved
         FROM agents`
    );
    for (const s of await io.fetchSockets()) {
      if (s.data?.role === 'admin_socket') s.emit('admin:agents', rows);
    }
  }

  async function broadcastPending(department) {
    const items = await getPendingList(department);
    console.log(`[broadcastPending] Sending pending list to dept_${department}`);
    const room = `dept_${department}`;
    const sockets = await io.in(room).fetchSockets();
    if (sockets.length) {
      io.to(room).emit('agent:pending_list', items);
    } else {
      io.to('agents').emit('agent:pending_list', items);
    }
  }

  return { getPendingList, broadcastPending, broadcastAgentPresence };
}
