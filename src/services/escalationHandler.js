import { loadRoutingRules } from '../db/routingrules.js';

export async function handleEscalation(reason, { socket, context, message }) {
  const rules = await loadRoutingRules();
   const lowerMsg = (message || '').toLowerCase();  // <-- SAFE GUARD

  const matchedRule = rules.find(rule =>
    rule.contains_any?.some(trigger =>
      lowerMsg.includes(trigger.toLowerCase())
    )
  );

  if (matchedRule) {
    if (matchedRule.then_reply) {
      socket.emit('bot_reply', { text: matchedRule.then_reply });
    }
    if (matchedRule.then_action === 'ESCALATE') {
      escalateToAgent(reason, socket, context);
    }
    return;
  }

  // fallback escalation
  escalateToAgent(reason, socket, context);
}

function escalateToAgent(reason, socket, context) {
      socket.emit('bot_reply', { text: 'You are now being connected to a human agent.', source: 'bot' });
  socket.emit('escalate_to_agent', {
    reason,
    context,
    message: 'You are now being connected to a human agent.'
  });
  context.escalated = true;
}
