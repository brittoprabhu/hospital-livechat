import { findBestFaqMatch, getSuggestionsForFaq } from './faqService.js';
import { handleEscalation } from './escalationHandler.js';

export async function processBotMessage({ message, socket, context, escalate }) {
  const intent = detectIntent(message);

  if (intent === 'faq') {
    const faq = findBestFaqMatch(message);
    if (faq && faq.score > 0.6) {
      socket.emit('bot_reply', {
        text: faq.answer,
        actions: ['👍 Helpful', '👎 Not Helpful'],
        suggestions: getSuggestionsForFaq(faq),
        source: 'faq'
      });
      context.lastFaqId = faq.id;
      context.feedback = 0;
    } else {
      if (!context.clarifiedOnce) {
        socket.emit('bot_reply', { text: "I'm not sure I understood that. Could you clarify?" });
        context.clarifiedOnce = true;
      } else {
        handleEscalation('low_confidence', { socket, context, message, escalate });
      }
    }
  } else if (intent === 'emergency') {
    handleEscalation('emergency_keyword', { socket, context, message, escalate });
  } else if (intent === 'human_request') {
    handleEscalation('user_requested_human', { socket, context, message, escalate });
  } else {
    socket.emit('bot_reply', { text: "I didn't understand that. Would you like to talk to a human agent?" });
  }
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  if (['agent', 'human', 'person', 'talk to someone'].some(k => lower.includes(k))) return 'human_request';
  if (['emergency', 'urgent', 'help now'].some(k => lower.includes(k))) return 'emergency';
  if (['what', 'how', 'can', 'where', 'when'].some(k => lower.split(/\s+/)[0])) return 'faq';
  return 'unknown';
}
