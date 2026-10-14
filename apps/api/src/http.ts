import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: '请求内容不是有效的 JSON' } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器暂时无法处理请求' } });
};

export function positiveId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, 'INVALID_ID', '无效的 ID');
  return id;
}

export function positiveQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 99) {
    throw new HttpError(400, 'INVALID_QUANTITY', '数量应为 1 至 99 的整数');
  }
  return value;
}
