import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Hash a plaintext password with bcrypt */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a stored value.
 * Supports both bcrypt hashes and legacy plaintext passwords
 * (backward-compatible during transition period).
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    return bcrypt.compare(plaintext, stored);
  }
  return plaintext === stored;
}

/** Returns true if the stored value is already a bcrypt hash */
export function isBcryptHash(stored: string): boolean {
  return stored.startsWith('$2b$') || stored.startsWith('$2a$');
}
