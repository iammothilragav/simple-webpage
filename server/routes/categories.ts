import { Hono } from 'hono';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Honovariable } from '../middleware';

const app = new Hono<Honovariable>()
  .get('/', async (c) => {
    try {
      const user = c.get('user');
      const result = await db
        .selectDistinct({ category: events.category })
        .from(events)
        .where(eq(events.userId, user.id));
      return c.json({
        success: true,
        categories: result.map((r) => r.category),
      });
    } catch (error) {
      return c.json({ success: false, error: 'Failed to fetch categories', categories: [] }, 500);
    }
  });

export default app;
