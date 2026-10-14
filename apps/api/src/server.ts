import { createApp } from './app.js';
import { getPool } from './db.js';

const port = Number(process.env.API_PORT || 3001);
getPool().query('SELECT 1').then(() => {
  createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`));
}).catch(error => { console.error('Cannot connect to MySQL:', error); process.exitCode = 1; });
