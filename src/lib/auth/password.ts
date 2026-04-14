const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBuffer = new Uint8Array(salt.byteLength);
  saltBuffer.set(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations
    },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export async function createPasswordHash(password: string, iterations = 310000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, iterations);
  return `pbkdf2_sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, rawIterations, saltPart, hashPart] = encoded.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !rawIterations || !saltPart || !hashPart) return false;

  const iterations = Number(rawIterations);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(saltPart);
  const stored = fromBase64Url(hashPart);
  const derived = await pbkdf2(password, salt, iterations);
  return bytesEqual(derived, stored);
}
