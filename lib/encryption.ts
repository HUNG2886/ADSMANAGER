const encoder = new TextEncoder();

async function keyFromEnv() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('ENCRYPTION_KEY phải có ít nhất 32 ký tự.');
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array) { let value = ''; bytes.forEach(byte => value += String.fromCharCode(byte)); return btoa(value); }
function fromBase64(value: string) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFromEnv(), encoder.encode(value));
  return `v1.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [version, iv, payload] = value.split('.');
  if (version !== 'v1' || !iv || !payload) throw new Error('Token mã hoá không hợp lệ.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await keyFromEnv(), fromBase64(payload));
  return new TextDecoder().decode(decrypted);
}
