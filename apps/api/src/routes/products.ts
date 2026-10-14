import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { getPool } from '../db.js';
import { HttpError, positiveId } from '../http.js';

export const productsRouter = Router();
productsRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  if (q.length > 100 || category.length > 80) throw new HttpError(400, 'INVALID_INPUT', '查询条件过长');
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT id, name, description, category, price_cents AS priceCents, stock, image_path AS imagePath FROM products WHERE is_active = 1 AND name LIKE ? AND (? = \'\' OR category = ?) ORDER BY id',
    [`%${q}%`, category, category]
  );
  res.json({ products: rows });
});
productsRouter.get('/:id', async (req, res) => {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT id, name, description, category, price_cents AS priceCents, stock, image_path AS imagePath FROM products WHERE id = ? AND is_active = 1',
    [positiveId(req.params.id)]
  );
  if (!rows[0]) throw new HttpError(404, 'NOT_FOUND', '商品不存在');
  res.json({ product: rows[0] });
});
