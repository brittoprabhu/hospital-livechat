import crypto from 'crypto';
export function newTokenHex(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}
