import crypto from 'crypto';

/**
 * @param {Object} deps
 * @param {import('pg').Pool} deps.pool
 * @param {import('socket.io').Server} deps.io
 * @param {Function} deps.broadcastPending  // from sockets helper
 */
export async function escalateToHuman({
  pool,
  io,
  broadcastPending,
  department,
  patientName = 'Guest',
  userId = null, // if you track end-user id, else keep null
  topic,
  intent,
  confidence,
  question,
  kbHit,        // { id, question, answer, source } or null
  transcript = [] // [{ from:'user'|'bot', text, at: isoString }]
}) {
  // 1) Create conversation (pending)
  const chatId = crypto.randomBytes(12).toString('hex');

  const context = {
    confidence,
    question,
    kbHit,
    transcript
  };

  await pool.query(
    `INSERT INTO conversations (id, department, patient_name, assigned_agent_id, status, topic, intent, context)
     VALUES ($1, $2, $3, NULL, 'pending', $4, $5, $6)`,
    [chatId, department, patientName, topic || null, intent || null, JSON.stringify(context)]
  );

  // 2) Seed initial messages (optional but very helpful to the agent)
  const now = new Date().toISOString();
  for (const m of transcript) {
    await pool.query(
      `INSERT INTO messages (chat_id, sender, text, agent_name, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        chatId,
        m.from === 'bot' ? 'agent' : 'patient', // store bot as 'agent' for UI continuity
        m.text || '',
        m.from === 'bot' ? '🤖 Assistant' : null,
        m.at || now
      ]
    );
  }

  // 3) Notify agents in department that a new pending chat is available
  await broadcastPending(department);

  // Optionally, join a socket room if you have a user socket here (not in this service)
  // io.to(`chat_${chatId}`).emit('patient:created', { chatId, status: 'pending' });

  return { chatId };
}
