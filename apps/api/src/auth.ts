import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from './http.js';

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is required');
  return value;
}

export function signToken(userId: number): string {
  return jwt.sign({ userId }, secret(), { expiresIn: '7d' });
}

export const requireUser: RequestHandler = (req, res, next) => {
  const [type, token] = (req.header('authorization') || '').split(' ');
  if (type !== 'Bearer' || !token) return next(new HttpError(401, 'UNAUTHORIZED', '请先登录'));
  try {
    const payload = jwt.verify(token, secret());
    if (typeof payload === 'string' || typeof payload.userId !== 'number') throw new Error('invalid token');
    res.locals.userId = payload.userId;
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录'));
  }
};
