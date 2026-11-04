import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import type { Pool } from 'mysql2/promise';
import { HttpError } from './http.js';
import { registerUser } from './register.js';

test('registers a normalized email and stores only a password hash', async () => {
  let saved: unknown[] = [];
  const db = { execute: async (_sql: string, values: unknown[]) => {
    saved = values;
    return [{ insertId: 42 }, []];
  } } as unknown as Pool;
  const user = await registerUser({ name: '  小明  ', email: '  TEST@Example.com ', password: 'Password123!' }, db);
  assert.deepEqual(user, { id: 42, email: 'test@example.com', name: '小明' });
  assert.equal(saved[0], 'test@example.com');
  assert.equal(saved[2], '小明');
  assert.notEqual(saved[1], 'Password123!');
  assert.equal(await bcrypt.compare('Password123!', saved[1] as string), true);
});

test('rejects invalid registration input before writing to the database', async () => {
  const db = { execute: async () => { throw new Error('should not write'); } } as unknown as Pool;
  for (const input of [
    { name: '', email: 'a@example.com', password: 'Password123!' },
    { name: '小明', email: 'invalid', password: 'Password123!' },
    { name: '小明', email: 'a@example.com', password: 'short' },
    { name: '小明', email: 'a@example.com', password: 'a'.repeat(73) }
  ]) {
    await assert.rejects(registerUser(input, db), (error: unknown) => error instanceof HttpError && error.status === 400);
  }
});

test('reports a duplicate email as a conflict', async () => {
  const db = { execute: async () => { throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' }); } } as unknown as Pool;
  await assert.rejects(
    registerUser({ name: '小明', email: 'a@example.com', password: 'Password123!' }, db),
    (error: unknown) => error instanceof HttpError && error.status === 409 && error.code === 'EMAIL_EXISTS'
  );
});
