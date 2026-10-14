import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import bcrypt from 'bcryptjs';
import { getPool } from './db.js';

const products = [
  [1, '云朵陶瓷杯', '一只适合慢慢喝咖啡的手作质感陶瓷杯。', '居家', 8900, 25, '/images/cup.svg'],
  [2, '晨光帆布包', '轻便耐用的日常随行帆布包。', '配饰', 12900, 18, '/images/bag.svg'],
  [3, '木质香氛蜡烛', '温柔木香，为夜晚留一盏小灯。', '居家', 15900, 12, '/images/candle.svg'],
  [4, '山野笔记本', '适合记录旅行、计划和灵感。', '文具', 4900, 40, '/images/notebook.svg'],
  [5, '亚麻桌布', '让餐桌多一点自然的纹理。', '居家', 19900, 10, '/images/cloth.svg'],
  [6, '午后玻璃花瓶', '透明玻璃与简洁线条，留给花一点空间。', '居家', 11900, 16, '/images/vase.svg']
] as const;

export async function seedDatabase(reset = false): Promise<void> {
  const db = getPool();
  if (reset) {
    for (const table of ['order_items', 'orders', 'cart_items', 'products', 'users']) {
      await db.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../sql/schema.sql');
  const schema = await readFile(path, 'utf8');
  for (const statement of schema.split(';').map(x => x.trim()).filter(Boolean)) {
    await db.query(statement);
  }
  const hash = await bcrypt.hash('Demo123456!', 10);
  for (const [email, name] of [['demo@example.com', '演示用户'], ['other@example.com', '另一位用户']]) {
    await db.execute('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', [email, hash, name]);
  }
  for (const product of products) {
    await db.execute('INSERT INTO products (id, name, description, category, price_cents, stock, image_path) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), category = VALUES(category), price_cents = VALUES(price_cents), image_path = VALUES(image_path)', [...product]);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  seedDatabase(process.argv.includes('--reset'))
    .then(() => { console.log('Database ready with demo data.'); return getPool().end(); })
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
