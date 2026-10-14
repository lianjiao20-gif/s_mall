import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { getPool } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError, positiveId, positiveQuantity } from '../http.js';

interface ProductRow extends RowDataPacket { id: number; stock: number }
interface CartRow extends RowDataPacket { productId: number; name: string; priceCents: number; quantity: number; stock: number; imagePath: string }
export const cartRouter = Router();
cartRouter.use(requireUser);

cartRouter.get('/', async (_req, res) => {
  const [rows] = await getPool().execute<CartRow[]>(
    'SELECT p.id AS productId, p.name, p.price_cents AS priceCents, c.quantity, p.stock, p.image_path AS imagePath FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ? ORDER BY p.id',
    [res.locals.userId]
  );
  res.json({ items: rows, totalCents: rows.reduce((sum, item) => sum + item.priceCents * item.quantity, 0) });
});

cartRouter.post('/items', async (req, res) => {
  const productId = positiveId(req.body?.productId);
  const quantity = positiveQuantity(req.body?.quantity);
  const [products] = await getPool().execute<ProductRow[]>('SELECT id, stock FROM products WHERE id = ? AND is_active = 1', [productId]);
  if (!products[0]) throw new HttpError(404, 'NOT_FOUND', '商品不存在');
  const [existing] = await getPool().execute<RowDataPacket[]>('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [res.locals.userId, productId]);
  const nextQuantity = Number(existing[0]?.quantity || 0) + quantity;
  if (nextQuantity > 99 || nextQuantity > products[0].stock) throw new HttpError(409, 'OUT_OF_STOCK', '库存不足或购买数量过多');
  await getPool().execute('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)', [res.locals.userId, productId, nextQuantity]);
  res.status(201).json({ productId, quantity: nextQuantity });
});

cartRouter.patch('/items/:productId', async (req, res) => {
  const productId = positiveId(req.params.productId);
  const quantity = positiveQuantity(req.body?.quantity);
  const [products] = await getPool().execute<ProductRow[]>('SELECT id, stock FROM products WHERE id = ? AND is_active = 1', [productId]);
  if (!products[0]) throw new HttpError(404, 'NOT_FOUND', '商品不存在');
  if (quantity > products[0].stock) throw new HttpError(409, 'OUT_OF_STOCK', '库存不足');
  const [result] = await getPool().execute<import('mysql2').ResultSetHeader>('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, res.locals.userId, productId]);
  if (!result.affectedRows) throw new HttpError(404, 'NOT_FOUND', '购物车中没有此商品');
  res.json({ productId, quantity });
});

cartRouter.delete('/items/:productId', async (req, res) => {
  const productId = positiveId(req.params.productId);
  await getPool().execute('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [res.locals.userId, productId]);
  res.status(204).end();
});
