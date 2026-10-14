import { config } from 'dotenv';
import mysql, { type Pool } from 'mysql2/promise';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env') });

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3307),
      user: process.env.DB_USER || 'smalldemo',
      password: process.env.DB_PASSWORD || 'smalldemo',
      database: process.env.DB_NAME || 'smalldemo',
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true
    });
  }
  return pool;
}
