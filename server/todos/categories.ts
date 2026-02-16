import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Context } from 'hono';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Honovariable } from '../middleware';

const CategoriesResponseSchema = z.object({
  success: z.boolean(),
  categories: z.array(z.string()),
  error: z.string().optional()
});

const categories = new OpenAPIHono<Honovariable>();

categories.openapi(
  createRoute({
    method: 'get',
    path: '/categories',
    tags: ['categories'],
    summary: 'Get all categories',
    description: 'Get all categories',
    responses: {
      200: {
        description: 'Categories retrieved successfully',
        content: {
          'application/json': {
            schema: CategoriesResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      500: {
        description: 'Internal server error',
      },
    },
  }),
  async (c: Context<Honovariable>) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ success: false, error: 'Unauthorized', categories: [] }, 401);
      }
      
      const result = await db
        .selectDistinct({ category: events.category })
        .from(events)
        .where(eq(events.userId, user.id));

      return c.json({
        success: true,
        categories: result.map((r) => r.category),
      });
    } catch (error) {
      console.error('Error fetching categories', error);
      return c.json({ success: false, error: 'Internal server error', categories: [] }, 500);
    }
  }
);

export default categories;

