import express from 'express';
import { searchFaq } from '../services/kb.js';
import { escalateToHuman } from '../services/escalation.js';
import { makeBroadcastHelpers } from '../sockets/index.js';
import { logger } from '../utils/logger.js';

/**
 * This router handles chatbot messages and escalation logic
 * 
 * @param {Object} options
 * @param {import('pg').Pool} options.pool - PostgreSQL pool instance
 * @param {SocketIO.Server} options.io - Socket.IO server instance
 * @param {string[]} options.departments - Array of department names
 */
export default function botRouter({ pool, io, departments }) {
  const router = express.Router();
  const { broadcastPending } = makeBroadcastHelpers(io, pool);

  const CRITICAL = [
    'ambulance','emergency','chest pain','unconscious','stroke','bleeding',
    'suicide','self harm','accident','breathing','severe'
  ];
  const HUMAN_KEYWORDS = ['human','agent','staff','help from person','talk to person','talk to someone'];

  function inferDepartment(message) {
    const txt = message.toLowerCase();
    for (const d of departments) {
      if (txt.includes(d.toLowerCase())) return d;
    }
    return 'General';
  }

  router.post('/message', async (req, res) => {
    const { userId = null, message = '', patientName = 'Guest', department: preferredDept } = req.body || {};
    const cleaned = String(message || '').trim();
    if (!cleaned) return res.status(400).json({ error: 'message required' });

    const lower = cleaned.toLowerCase();
    const isCritical = CRITICAL.some(k => lower.includes(k));
    const wantsHuman = HUMAN_KEYWORDS.some(k => lower.includes(k));

    let kbHit = null, confidence = 0;
    try {
      const { hit, rank } = await searchFaq(pool, cleaned);
      kbHit = hit;
      confidence = rank || 0;
    } catch (e) {
      logger.error({ evt: 'kb_search_error', error: e.message });
    }

    const department = preferredDept && departments.includes(preferredDept)
      ? preferredDept
      : inferDepartment(cleaned);

    const transcript = [
      { from: 'user', text: cleaned, at: new Date().toISOString() }
    ];

    if (!isCritical && !wantsHuman && (!kbHit || confidence < 0.35)) {
      logger.info({ evt: 'bot_clarify', userId, department, confidence });
      return res.json({
        type: 'clarify',
        message: "I’m not fully sure I got that. Could you clarify what you’re looking for? For appointments, say 'book', 'reschedule', or 'cancel'.",
        suggested: ['Book appointment','Lab reports','Visiting hours','Contact number'],
        confidence
      });
    }

    if (!isCritical && !wantsHuman && kbHit && confidence >= 0.35) {
      logger.info({ evt: 'faq_answer', userId, kbId: kbHit.id, confidence, department });
      return res.json({
        type: 'answer',
        answer: kbHit.answer,
        source: kbHit.source || null,
        confidence,
        actions: [
          { type: 'link', text: 'Open details', href: kbHit.source || '#' },
          { type: 'escalate', text: 'Talk to an agent' }
        ]
      });
    }

    logger.info({ evt: 'escalate', reason: isCritical ? 'critical' : (wantsHuman ? 'user_requested' : 'low_confidence'), userId, department, confidence });

    transcript.push({
      from: 'bot',
      text: `Escalating to a human agent in ${department}. Context: "${cleaned}"`,
      at: new Date().toISOString()
    });

    try {
      const { chatId } = await escalateToHuman({
        pool,
        io,
        broadcastPending,
        department,
        patientName,
        userId,
        topic: kbHit?.question || 'General Query',
        intent: isCritical ? 'critical_help' : (wantsHuman ? 'ask_human' : 'low_confidence'),
        confidence,
        question: cleaned,
        kbHit,
        transcript
      });

      return res.json({
        type: 'escalated',
        chatId,
        department,
        message: `I’ve connected you to an agent in ${department}. Someone will be with you shortly.`,
      });
    } catch (e) {
      logger.error({ evt: 'escalate_failed', error: e.message });
      return res.status(500).json({ error: 'Escalation failed. Please try again.' });
    }
  });

  router.post('/escalate', async (req, res) => {
    const { message = '', department: preferredDept, patientName = 'Guest', userId = null } = req.body || {};
    const department = preferredDept && departments.includes(preferredDept) ? preferredDept : 'General';
    const transcript = [
      { from: 'user', text: message || 'Talk to human', at: new Date().toISOString() },
      { from: 'bot', text: `Escalating to a human agent in ${department}.`, at: new Date().toISOString() }
    ];
    try {
      const { chatId } = await escalateToHuman({
        pool, io, broadcastPending,
        department, patientName, userId,
        topic: 'User requested human',
        intent: 'ask_human',
        confidence: 0,
        question: message,
        kbHit: null,
        transcript
      });
      res.json({ type: 'escalated', chatId, department });
    } catch (e) {
      res.status(500).json({ error: 'Escalation failed' });
    }
  });

  return router;
}
    