import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { errorHandler, HttpError } from './http.js';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: '拾间 API 文档' }));
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', '接口不存在')));
  app.use(errorHandler);
  return app;
}
