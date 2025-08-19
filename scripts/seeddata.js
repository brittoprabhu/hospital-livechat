// scripts/seedData.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedFaqEntries() {
  const faqs = [
    {
      question: "What are your working hours?",
      answer: "We are open Monday to Friday, 9 AM to 5 PM.",
      keywords: ['hours', 'working', 'timing'],
      tags: ['general'],
    },
    {
      question: "How do I book an appointment?",
      answer: "You can book an appointment through our website or call our front desk.",
      keywords: ['appointment', 'book', 'schedule'],
      tags: ['booking'],
    },
    {
      question: "Where is the pharmacy located?",
      answer: "The pharmacy is on the ground floor next to the reception.",
      keywords: ['pharmacy', 'medicines'],
      tags: ['location'],
    }
  ];

  for (const faq of faqs) {
    await pool.query(
      `INSERT INTO faq_entries (question, answer, keywords, tags) VALUES ($1, $2, $3, $4)`,
      [faq.question, faq.answer, faq.keywords, faq.tags]
    );
  }
  console.log(`✅ Inserted ${faqs.length} FAQ entries.`);
}

async function seedRoutingRules() {
  const rules = [
    {
      department: 'emergency',
      contains_any: ['chest pain', 'breathless', 'faint', 'bleeding'],
      then_reply: 'This seems urgent. Connecting you to emergency support.',
      then_action: 'ESCALATE',
      priority: 1
    },
    {
      department: 'pharmacy',
      contains_any: ['medicine', 'pharmacy', 'refill'],
      then_reply: 'I can help with pharmacy-related queries.',
      then_action: '',
      priority: 10
    }
  ];

  for (const rule of rules) {
    await pool.query(
      `INSERT INTO routing_rules (department, contains_any, then_reply, then_action, priority) VALUES ($1, $2, $3, $4, $5)`,
      [rule.department, rule.contains_any, rule.then_reply, rule.then_action, rule.priority]
    );
  }
  console.log(`✅ Inserted ${rules.length} routing rules.`);
}

async function main() {
  try {
    await seedFaqEntries();
    await seedRoutingRules();
    console.log("🎉 Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

main();
