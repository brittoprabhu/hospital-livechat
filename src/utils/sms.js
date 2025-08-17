import { ENV } from '../config/index.js';

export async function sendSms(to, body) {
  if (!ENV.TWILIO_ENABLED) { console.log('SMS disabled; not sending:', to, body); return; }
  try {
    const { default: Twilio } = await import('twilio');
    const client = Twilio(ENV.TWILIO_SID, ENV.TWILIO_TOKEN);
    await client.messages.create({ body, from: ENV.TWILIO_FROM, to });
  } catch (err) {
    console.error('SMS error', err);
  }
}
