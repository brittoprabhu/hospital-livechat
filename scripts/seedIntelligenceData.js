// scripts/seedIntelligenceData.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


async function seedFaqs() {
  const faqs = [
    {
      question: 'What are your visiting hours?',
      answer: 'Our visiting hours are from 9am to 5pm on weekdays.',
      keywords: ['visiting hours', 'timings', 'open'],
      tags: ['general', 'hospital'],
      regexes: ['visiting.*hours'],
    },
    {
      question: 'How to book an appointment?',
      answer: 'You can book appointments through our website or call reception.',
      keywords: ['book', 'appointment'],
      tags: ['appointment'],
      regexes: ['book.*appointment'],
    },
  ];

  for (const faq of faqs) {
    await pool.query(
      `INSERT INTO faq_entries (question, answer, keywords, tags, regexes)
       VALUES ($1, $2, $3, $4, $5)`,
      [faq.question, faq.answer, faq.keywords, faq.tags, faq.regexes]
    );
  }
  console.log('✅ Seeded FAQ entries');
}

async function seedRoutingRules() {
  const rules = [
    {
      department: 'Emergency',
      contains_any: ['accident', 'emergency', 'urgent'],
      then_reply: 'Transferring you to our emergency department...',
      then_action: 'ESCALATE',
    },
    {
      department: 'Appointments',
      contains_any: ['book', 'appointment', 'schedule'],
      then_reply: 'I’ll guide you to schedule an appointment.',
      then_action: 'SHOW_FORM',
    },
  ];

  for (const rule of rules) {
    await pool.query(
      `INSERT INTO routing_rules (department, contains_any, then_reply, then_action)
       VALUES ($1, $2, $3, $4)`,
      [rule.department, rule.contains_any, rule.then_reply, rule.then_action]
    );
  }
  console.log('✅ Seeded routing rules');
}

async function seedDecisionFlows() {
  const flows = [
    {
      name: 'Check-in Triage',
      description: 'Triage patient questions at check-in.',
      structure: {
        nodes: [
          { id: 1, question: 'Do you have a fever?', yes: 2, no: 3 },
          { id: 2, action: 'Refer to doctor' },
          { id: 3, action: 'Continue normal check-in' },
        ],
      },
    },
  ];

  for (const flow of flows) {
    await pool.query(
      `INSERT INTO decision_flows (name, description, structure)
       VALUES ($1, $2, $3)`,
      [flow.name, flow.description, flow.structure]
    );
  }
  console.log('✅ Seeded decision flows');
}

async function seedRules() {
  const rules = [
    {
      condition: { contains: ['prescription'] },
      action: { escalate: true, reason: 'clinical_keyword' },
    },
    {
      condition: { feedbackNegativeCount: 2 },
      action: { escalate: true, reason: 'negative_feedback' },
    },
  ];

  for (const rule of rules) {
    await pool.query(
      `INSERT INTO rules (condition, action)
       VALUES ($1, $2)`,
      [rule.condition, rule.action]
    );
  }
  console.log('✅ Seeded rules');
}

async function seedForms() {
  const forms = [
    {
      name: 'Appointment Request',
      schema: {
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'phone', type: 'tel', required: true },
          { name: 'department', type: 'select', options: ['Cardiology', 'Dermatology'] },
        ],
      },
    },
  ];

  for (const form of forms) {
    await pool.query(
      `INSERT INTO forms (name, schema)
       VALUES ($1, $2)`,
      [form.name, form.schema]
    );
  }
  console.log('✅ Seeded forms');
}

async function main() {
  try {
    await seedFaqs();
    await seedRoutingRules();
    await seedDecisionFlows();
    await seedRules();
    await seedForms();
    console.log('🎉 All intelligence data seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

main();
