import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const faqs = [
  // Root-level general questions
  { question: "How can I book an appointment?", answer: "You can book an appointment by calling our reception or using the online portal.", parent_id: null },
  { question: "Where is the hospital located?", answer: "We are located at 123 Health Avenue, MedCity.", parent_id: null },

  // Child questions under appointment
  { question: "Can I reschedule my appointment?", answer: "Yes, call our reception to reschedule or use the online system.", parent_of: "How can I book an appointment?" },
  { question: "Is there a fee for cancelling?", answer: "There is no cancellation fee if done 24 hours in advance.", parent_of: "How can I book an appointment?" },

  // Department-level entries
  { question: "Where is the radiology department?", answer: "Radiology is on the 2nd floor, Block B.", parent_id: null },
  { question: "Where is the cardiology department?", answer: "Cardiology is in Block C, 1st floor.", parent_id: null },

  // Emergency
  { question: "What should I do in an emergency?", answer: "Please go directly to the Emergency room or call our hotline: 123-456-7890.", parent_id: null },
  { question: "Do you have 24/7 emergency care?", answer: "Yes, our emergency department operates round-the-clock.", parent_of: "What should I do in an emergency?" },

  // Billing
  { question: "I need help with my bill", answer: "Please visit the billing counter or call extension 400 for assistance.", parent_id: null },
  { question: "Can I pay online?", answer: "Yes, we offer online payment through our patient portal.", parent_of: "I need help with my bill" },
];

async function seedFaqEntries() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const idMap = new Map();

    // First pass: insert only parentless (root-level) questions
    for (const faq of faqs) {
      if (!faq.parent_of) {
        const res = await client.query(
          'INSERT INTO faq_entries (question, answer, parent_id) VALUES ($1, $2, $3) RETURNING id',
          [faq.question, faq.answer, faq.parent_id]
        );
        idMap.set(faq.question, res.rows[0].id);
      }
    }

    // Second pass: insert children with resolved parent_id
    for (const faq of faqs) {
      if (faq.parent_of) {
        const parentId = idMap.get(faq.parent_of);
        if (!parentId) throw new Error(`Parent question not found: ${faq.parent_of}`);
        await client.query(
          'INSERT INTO faq_entries (question, answer, parent_id) VALUES ($1, $2, $3)',
          [faq.question, faq.answer, parentId]
        );
      }
    }

    await client.query('COMMIT');
    console.log('FAQ entries seeded successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding FAQ entries:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

seedFaqEntries();
