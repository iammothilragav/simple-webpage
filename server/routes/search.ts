import { Hono } from 'hono';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { searchEventFilterSchema } from '@/lib/validations';
import { Honovariable } from '../middleware';

const app = new Hono<Honovariable>()
  .get('/', zValidator('query', searchEventFilterSchema), async (c) => {
    try {
      const user = c.get('user');
      const filter = c.req.valid('query');
      const conditions: SQL<unknown>[] = [eq(events.userId, user.id)];

      const searchCondition = or(
        ilike(events.title, `%${filter.search}%`),
        ilike(events.description, `%${filter.search}%`),
        ilike(events.location, `%${filter.search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);

      if (filter.categories && filter.categories.length > 0) {
         const catCondition = or(...filter.categories.map((cat) => eq(events.category, cat)));
         if (catCondition) conditions.push(catCondition);
      }

      if (filter.colors && filter.colors.length > 0) {
        const colCondition = or(...filter.colors.map((col) => eq(events.color, col)));
        if (colCondition) conditions.push(colCondition);
      }

      if (filter.locations && filter.locations.length > 0) {
        const locCondition = or(...filter.locations.map((loc) => ilike(events.location, `%${loc}%`)));
        if (locCondition) conditions.push(locCondition);
      }

      if (filter.isRepeating) {
        conditions.push(eq(events.isRepeating, filter.isRepeating === 'true'));
      }

      const limit = filter.limit || 10;
      const offset = filter.offset || 0;

      const result = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(events.startDate)
        .limit(limit)
        .offset(offset)
        .execute();

      const totalCountResult = await db
        .select({ count: events.id })
        .from(events)
        .where(and(...conditions));

      return c.json({
        success: true,
        events: result,
        totalCount: totalCountResult.length,
        hasMore: result.length === limit,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error searching events',
          events: [],
          totalCount: 0,
          hasMore: false,
        },
        500
      );
    }
  });

export default app;
