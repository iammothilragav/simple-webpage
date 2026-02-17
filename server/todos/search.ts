import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { searchEventFilterSchema } from '@/lib/validations';
import { HonoVariable } from '../middleware';

// In your validations file
const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startDate: z.string(), // ISO string
  endDate: z.string(),   // ISO string
  startTime: z.string(),
  endTime: z.string(),
  category: z.string(),
  color: z.string(),
  location: z.string().nullable(),
  isRepeating: z.boolean(),
  repeatingType: z.string().nullable(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SearchResponseSchema = z.object({
  success: z.boolean(),
  events: z.array(EventSchema),
  totalCount: z.number(),
  hasMore: z.boolean(),
  error: z.string().optional(),
});

const search = new OpenAPIHono<HonoVariable>()
  .openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['search'],
    summary: 'Search events',
    description: 'Search events',
    request: {
      query: searchEventFilterSchema
    },
    responses: {
      200: {
        description: 'Events retrieved successfully',
        content: {
          'application/json': {
            schema: SearchResponseSchema,
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
  async (c) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ success: false, error: 'Unauthorized', events: [], totalCount: 0, hasMore: false }, 401);
      }
      
      const filter = c.req.valid('query');
      const conditions: SQL<unknown>[] = [eq(events.userId, user.id)];

      const searchCondition = or(
        ilike(events.title, `%${filter.search}%`),
        ilike(events.description, `%${filter.search}%`),
        ilike(events.location, `%${filter.search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);

      if (filter.categories && filter.categories.length > 0) {
         const catCondition = or(...filter.categories.map((cat: string) => eq(events.category, cat)));
         if (catCondition) conditions.push(catCondition);
      }

      if (filter.colors && filter.colors.length > 0) {
        const colCondition = or(...filter.colors.map((col: string) => eq(events.color, col)));
        if (colCondition) conditions.push(colCondition);
      }

      if (filter.locations && filter.locations.length > 0) {
        const locCondition = or(...filter.locations.map((loc: string) => ilike(events.location, `%${loc}%`)));
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
        events: result.map(e => ({
          ...e,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
        totalCount: totalCountResult.length,
        hasMore: result.length === limit,
      });
    } catch (error) {
      console.error('Error fetching events', error);
      return c.json({
        success: false,
        error: 'Internal server error',
        events: [],
        totalCount: 0,
        hasMore: false,
      }, 500);
    }
  }
);

export default search;