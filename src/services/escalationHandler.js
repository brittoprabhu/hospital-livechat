import { loadRoutingRules } from '../db/routingrules.js';

export async function handleEscalation(reason, { socket, context, message, escalate }) {
  const rules = await loadRoutingRules();
  const lowerMsg = (message || '').toLowerCase();

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
      escalateToAgent(reason, socket, context, escalate, matchedRule.department);
    }
    return;
  }

  // fallback escalation
  escalateToAgent(reason, socket, context, escalate);
}

function escalateToAgent(reason, socket, context, escalate, department) {
  socket.emit('bot_reply', { text: 'You are now being connected to a human agent.', source: 'bot' });
  socket.emit('escalate_to_agent', {
    reason,
    context,
    message: 'You are now being connected to a human agent.'
  });
  context.escalated = true;
  if (typeof escalate === 'function') {
    escalate({ department });
  }
}
