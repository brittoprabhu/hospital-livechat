// services/escalationManager.js
const CLINICAL_KEYWORDS = ['prescription', 'diagnosis', 'symptoms', 'treatment', 'surgery'];
const CRITICAL_KEYWORDS = ['emergency', 'urgent', 'help now', 'immediately', 'call'];

export function shouldEscalate(message, context) {
  const lower = message.toLowerCase();

  if (['agent', 'human', 'person'].some(k => lower.includes(k))) {
    return { reason: 'user_requested_human' };
  }

  if (CRITICAL_KEYWORDS.some(k => lower.includes(k))) {
    return { reason: 'emergency_keyword' };
  }

  if (CLINICAL_KEYWORDS.some(k => lower.includes(k))) {
    return {
      reason: 'clinical_question',
      disclaimer: 'Note: For medical queries, we’ll connect you to a human. The bot cannot provide clinical advice.'
    };
  }

  if (context.feedback <= -2) {
    return { reason: 'negative_feedback_twice' };
  }

  if (context.clarifiedOnce && !context.successfulClarification) {
    return { reason: 'clarification_failed' };
  }

  return null;
}
