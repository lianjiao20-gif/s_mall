import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import { getPool } from '../db.js';
import { signToken, requireUser } from '../auth.js';
import { HttpError } from '../http.js';
import { registerUser } from '../register.js';

interface UserRow extends RowDataPacket { id: number; email: string; name: string; password_hash: string }
export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const user = await registerUser(req.body || {});
  res.status(201).json({ token: signToken(user.id), user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    throw new HttpError(400, 'INVALID_INPUT', '请输入邮箱和密码');
  }
  const [rows] = await getPool().execute<UserRow[]>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误');
  }
  res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get('/me', requireUser, async (_req, res) => {
  const [rows] = await getPool().execute<UserRow[]>('SELECT id, email, name FROM users WHERE id = ?', [res.locals.userId]);
  if (!rows[0]) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录');
  res.json({ user: rows[0] });
});
