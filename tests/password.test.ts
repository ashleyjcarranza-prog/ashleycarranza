import { describe, expect, it } from 'vitest';
import { createPasswordHash, verifyPassword } from '../src/lib/auth/password';

describe('password hashing', () => {
  it('verifies the original password', async () => {
    const hash = await createPasswordHash('correct horse battery staple');

    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });
});
