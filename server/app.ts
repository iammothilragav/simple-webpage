import { Hono } from 'hono';
import { authMiddleware } from './middleware';
import eventsRouter from './routes/events';
import categoriesRouter from './routes/categories';
import searchRouter from './routes/search';

const app = new Hono().basePath('/api');

// Apply authentication middleware globally
app.use('*', authMiddleware);

const routes = app
  .route('/events', eventsRouter)
  .route('/categories', categoriesRouter)
  .route('/search', searchRouter);

export type AppType = typeof routes;
export default app;

