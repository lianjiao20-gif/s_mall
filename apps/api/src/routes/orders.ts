import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError, positiveId } from '../http.js';

interface CheckoutRow extends RowDataPacket { productId: number; name: string; priceCents: number; quantity: number; stock: number; isActive: number }
interface OrderRow extends RowDataPacket { id: number; totalCents: number; status: string; createdAt: Date }
export const ordersRouter = Router();
ordersRouter.use(requireUser);

ordersRouter.post('/', async (_req, res) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [items] = await connection.execute<CheckoutRow[]>(
      'SELECT c.product_id AS productId, c.quantity, p.name, p.price_cents AS priceCents, p.stock, p.is_active AS isActive FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ? ORDER BY p.id FOR UPDATE',
      [res.locals.userId]
    );
    if (!items.length) throw new HttpError(400, 'EMPTY_CART', '购物车是空的');
    for (const item of items) {
      if (!item.isActive || item.quantity > item.stock) throw new HttpError(409, 'OUT_OF_STOCK', `${item.name} 库存不足`);
    }
    const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const [created] = await connection.execute<ResultSetHeader>(
      'INSERT INTO orders (user_id, total_cents, status) VALUES (?, ?, ?)',
      [res.locals.userId, totalCents, 'paid_demo']
    );
    for (const item of items) {
      await connection.execute('INSERT INTO order_items (order_id, product_id, product_name, price_cents, quantity) VALUES (?, ?, ?, ?, ?)', [created.insertId, item.productId, item.name, item.priceCents, item.quantity]);
      await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
    }
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [res.locals.userId]);
    await connection.commit();
    res.status(201).json({ order: { id: created.insertId, totalCents, status: 'paid_demo' } });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

ordersRouter.get('/', async (_req, res) => {
  const [rows] = await getPool().execute<OrderRow[]>(
    'SELECT id, total_cents AS totalCents, status, created_at AS createdAt FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC',
    [res.locals.userId]
  );
  res.json({ orders: rows });
});

ordersRouter.get('/:id', async (req, res) => {
  const id = positiveId(req.params.id);
  const [orders] = await getPool().execute<OrderRow[]>(
    'SELECT id, total_cents AS totalCents, status, created_at AS createdAt FROM orders WHERE id = ? AND user_id = ?',
    [id, res.locals.userId]
  );
  if (!orders[0]) throw new HttpError(404, 'NOT_FOUND', '订单不存在');
  const [items] = await getPool().execute<RowDataPacket[]>(
    'SELECT product_id AS productId, product_name AS name, price_cents AS priceCents, quantity FROM order_items WHERE order_id = ? ORDER BY id',
    [id]
  );
  res.json({ order: { ...orders[0], items } });
});
