import { Hono } from 'hono';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, between, eq, ilike, or, lte, gte, SQL } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { createEventSchema, eventFilterSchema } from '@/lib/validations';
import { combineDateAndTime } from '@/lib/date';
import { Honovariable } from '../middleware';
import { getDateRange } from '../utils';

const app = new Hono<Honovariable>()
  .get('/', zValidator('query', eventFilterSchema), async (c) => {
    try {
      const user = c.get('user');
      const filter = c.req.valid('query');
      const currentDate = new Date(filter.date);
      const dateRange = getDateRange(
        currentDate,
        filter.view || 'month',
        Number(filter.daysCount) || 7
      );

      const conditions: SQL<unknown>[] = [eq(events.userId, user.id)];
      
      const dateCondition = or(
          and(
            between(events.startDate, dateRange.start, dateRange.end),
            between(events.endDate, dateRange.start, dateRange.end)
          ),
          or(
            between(events.startDate, dateRange.start, dateRange.end),
            between(events.endDate, dateRange.start, dateRange.end),
            and(
              lte(events.startDate, dateRange.start),
              gte(events.endDate, dateRange.end)
            )
          )
        );

      if (dateCondition) {
        conditions.push(dateCondition);
      }

      if (filter.title) {
        conditions.push(ilike(events.title, `%${filter.title}%`)!);
      }

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

      if (filter.isRepeating !== undefined) {
        conditions.push(eq(events.isRepeating, String(filter.isRepeating) === 'true'));
      }

      const result = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .execute();

      return c.json({ success: true, events: result });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error fetching events',
          events: [], 
        },
        500
      );
    }
  })
  .post('/', zValidator('json', createEventSchema), async (c) => {
    try {
      const user = c.get('user');
      const data = c.req.valid('json');
      const startDateTime = combineDateAndTime(data.startDate, data.startTime);
      const endDateTime = combineDateAndTime(data.endDate, data.endTime);

      const [newEvent] = await db
        .insert(events)
        .values({
          ...data,
          startDate: startDateTime,
          endDate: endDateTime,
          isRepeating: data.isRepeating ?? false,
          repeatingType: data.repeatingType ?? null,
          userId: user.id,
        })
        .returning();

      return c.json({ success: true, event: newEvent });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Error creating event',
        },
        500
      );
    }
  })
  .patch('/:id', zValidator('json', createEventSchema.partial()), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    try {
      const updateData: any = { ...data, updatedAt: new Date() };
      
      if (data.startDate && data.startTime) {
        updateData.startDate = combineDateAndTime(data.startDate, data.startTime);
      }
      if (data.endDate && data.endTime) {
        updateData.endDate = combineDateAndTime(data.endDate, data.endTime);
      }

      const [updatedEvent] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, id))
        .returning();

      if (!updatedEvent) {
        return c.json({ success: false, error: 'Event not found' }, 404);
      }

      return c.json({ success: true, event: updatedEvent });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update event',
        },
        500
      );
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const [deletedEvent] = await db
        .delete(events)
        .where(eq(events.id, id))
        .returning();

      if (!deletedEvent) {
        return c.json({ success: false, error: 'Event not found' }, 404);
      }

      return c.json({ success: true, event: deletedEvent });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete event',
        },
        500
      );
    }
  });

export default app;
