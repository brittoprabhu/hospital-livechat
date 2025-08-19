// services/faqService.js
import { loadFaqs } from '../db/faq.js';

let faqCache = [];
export async function initializeFaqs() {
  faqCache = await loadFaqs();
  console.log('[FAQ] FAQ Cache initialized with entries:');
  faqCache.forEach(f => {
    console.log(`ID: ${f.id}, Q: ${f.question}, Parent: ${f.parent_id}`);
  });
}


export function findBestFaqMatch(message) {
  if (!faqCache.length) return null;
  const lowerMsg = message.toLowerCase();

  const scored = faqCache.map(faq => {
    const score = similarity(lowerMsg, faq.question.toLowerCase());
    return { ...faq, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
export function getSuggestionsForFaq(faq) {
  if (!faq || !faq.id) return [];
  console.log(`[FAQ] Looking for children of FAQ ID ${faq.id}`);
  console.log(`[FAQ] Total FAQs loaded: ${faqCache.length}`);

  const children = faqCache.filter(f => Number(f.parent_id) === Number(faq.id));
  console.log('[FAQ] Matched children:', children.map(c => c.question));

  return children.map(child => ({ question: child.question, id: child.id }));
}


function similarity(a, b) {
  const aWords = new Set(a.split(/\W+/));
  const bWords = new Set(b.split(/\W+/));
  const match = [...aWords].filter(w => bWords.has(w));
  return match.length / Math.max(aWords.size, 1);
}

