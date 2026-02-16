import { OpenAPIHono } from '@hono/zod-openapi';
import { authMiddleware } from './middleware';
import { todoApp } from './todos';
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono().basePath('/api');

// Apply authentication middleware globally
app.use('*', authMiddleware);

app.doc31('/reference/swagger.json', {
  openapi: '3.1.0',
  info: {
    title: 'Simple webpage',
    version: '0.0.1',
    description: 'API documentation for webpage application',
  },
})

app.get(
  '/reference',
  Scalar({
    url: '/api/reference/swagger.json',
    pageTitle: 'Simple webpage API Documentation',
  })
)

const routes = app
  .route('/', todoApp);


export type AppType = typeof routes;
export default app;

