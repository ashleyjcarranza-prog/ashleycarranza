import { createPasswordHash } from '../src/lib/auth/password';

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error('Usage: npm run password:hash -- "<password>"');
    process.exit(1);
  }

  const hash = await createPasswordHash(password);
  console.log(hash);
}

void main();
