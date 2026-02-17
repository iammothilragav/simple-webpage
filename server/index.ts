import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware, HonoVariable } from './middleware';
import events from './todos/events';
import categories from './todos/categories';
import search from './todos/search';
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono<HonoVariable>().basePath('/api');

// Apply authentication middleware globally
app.use(authMiddleware);
const routes = app
  .doc31('/reference/swagger.json', {
    openapi: '3.1.0',
    info: {
      title: 'Simple webpage',
      version: '0.0.1',
      description: 'API documentation for webpage application',
    },
  })
  .get(
    '/reference',
    Scalar({
      url: '/reference/swagger.json',
      pageTitle: 'Simple webpage API Documentation',
    })
  )
  .route('/', events)
  .route('/', categories)
  .route('/', search);

export type AppType = typeof routes;
export default app;

