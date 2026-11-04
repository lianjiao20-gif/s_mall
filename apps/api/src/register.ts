import bcrypt from 'bcryptjs';
import type { Pool, ResultSetHeader } from 'mysql2/promise';
import { getPool } from './db.js';
import { HttpError } from './http.js';

export interface RegistrationInput { name: unknown; email: unknown; password: unknown }
export interface RegisteredUser { id: number; email: string; name: string }

export async function registerUser(input: RegistrationInput, db: Pool = getPool()): Promise<RegisteredUser> {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input.password;
  if (!name || name.length > 100) throw new HttpError(400, 'INVALID_NAME', '昵称应为 1 至 100 个字符');
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', '请输入有效的邮箱地址');
  }
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new HttpError(400, 'INVALID_PASSWORD', '密码长度应为 8 至 72 字节');
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, hash, name]
    );
    return { id: result.insertId, email, name };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'EMAIL_EXISTS', '该邮箱已注册，请直接登录');
    }
    throw error;
  }
}
