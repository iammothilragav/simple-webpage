import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { Context } from 'hono';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, between, eq, ilike, or, lte, gte, SQL } from 'drizzle-orm';
import { createEventSchema, eventFilterSchema, CreateTaskSchema, EventFilter, UpdateTaskSchema } from '@/lib/validations';
import { combineDateAndTime } from '@/lib/date';
import { HonoVariable } from '../middleware';
import { getDateRange } from '../utils';

// Schema for Event Response
const EventSchema = z.object({
  id: z.string().openapi({ example: '1' }),
  title: z.string().openapi({ example: 'Event Title' }),
  description: z.string().openapi({ example: 'Event Description' }),
  startDate: z.string().openapi({ example: '2022-01-01T10:00:00Z' }),
  endDate: z.string().openapi({ example: '2022-01-01T11:00:00Z' }),
  startTime: z.string().openapi({ example: '10:00' }),
  endTime: z.string().openapi({ example: '11:00' }),
  category: z.string().openapi({ example: 'Work' }),
  color: z.string().openapi({ example: 'blue' }),
  location: z.string().openapi({ example: 'Work' }),
  isRepeating: z.boolean().openapi({ example: false }),
  repeatingType: z.enum(['daily', 'weekly', 'monthly']).nullable().openapi({ example: 'daily' }),
  userId: z.string().openapi({ example: '1' }),
  createdAt: z.string().openapi({ example: '2022-01-01T10:00:00Z' }),
  updatedAt: z.string().openapi({ example: '2022-01-01T10:00:00Z' }),
});

const EventsListResponseSchema = z.object({
    success: z.boolean(),
    events: z.array(EventSchema),
    error: z.string().optional()
});

const SingleEventResponseSchema = z.object({
    success: z.boolean(),
    event: EventSchema.optional(),
    error: z.string().optional()
});

const eventRoutes = new OpenAPIHono<HonoVariable>()

.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['events'],
    summary: 'Get all events',
    description: 'Get all events',
    request: {
      query: eventFilterSchema
    },
    responses: {
      200: {
        description: 'User events retrieved successfully',
        content: {
          'application/json': {
            schema: EventsListResponseSchema,
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
  async (c: Context<HonoVariable>) => {
    try {
      const user = c.get('user');
      if (!user?.id) {
        return c.json({ success: false, error: 'Unauthorized', events: [] }, 401);
      }
      
      const filter = c.req.valid('query' as never) as EventFilter;
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

      if (filter.isRepeating !== undefined) {
        conditions.push(eq(events.isRepeating, String(filter.isRepeating) === 'true'));
      }

      const result = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .execute();

      return c.json({
        success: true,
        events: result.map(e => ({
          ...e,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error('Error fetching events', error);
      return c.json({ success: false, error: 'Internal server error', events: [] }, 500);
    }
  }
)

.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['events'],
    summary: 'Create a new event',
    description: 'Create a new event',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: createEventSchema
                }
            }
        }
    },
    responses: {
      200: {
        description: 'Event created successfully',
        content: {
          'application/json': {
            schema: SingleEventResponseSchema,
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
  async (c: Context<HonoVariable>) => {
    try {
        const user = c.get('user');
        if (!user?.id) {
            return c.json({ success: false, error: 'Unauthorized' }, 401);
        }
        const data = c.req.valid('json' as never) as CreateTaskSchema;
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

        return c.json({ 
            success: true, 
            event: {
                ...newEvent,
                startDate: newEvent.startDate.toISOString(),
                endDate: newEvent.endDate.toISOString(),
                createdAt: newEvent.createdAt.toISOString(),
                updatedAt: newEvent.updatedAt.toISOString(),
            } 
        });
    } catch (error) {
        return c.json(
            {
            success: false,
            error: error instanceof Error ? error.message : 'Error creating event',
            },
            500
        );
    }
  }
)

.openapi(
  createRoute({
    method: 'patch',
    path: '/:id',
    tags: ['events'],
    summary: 'Update an event',
    description: 'Update an event',
    request: {
        params: z.object({
            id: z.string()
        }),
        body: {
            content: {
                'application/json': {
                    schema: createEventSchema.partial()
                }
            }
        }
    },
    responses: {
      200: {
        description: 'Event updated successfully',
        content: {
          'application/json': {
            schema: SingleEventResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      404: {
        description: 'Event not found'
      },
      500: {
        description: 'Internal server error',
      },
    },
  }),
  async (c: Context<HonoVariable>) => {
    const id = c.req.param('id');
    const data = c.req.valid('json' as never) as UpdateTaskSchema;
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

      return c.json({ 
          success: true, 
          event: {
            ...updatedEvent,
            startDate: updatedEvent.startDate.toISOString(),
            endDate: updatedEvent.endDate.toISOString(),
            createdAt: updatedEvent.createdAt.toISOString(),
            updatedAt: updatedEvent.updatedAt.toISOString(),
          } 
        });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update event',
        },
        500
      );
    }
  }
)

.openapi(
  createRoute({
    method: 'delete',
    path: '/:id',
    tags: ['events'],
    summary: 'Delete an event',
    description: 'Delete an event',
    request: {
        params: z.object({
            id: z.string()
        })
    },
    responses: {
      200: {
        description: 'Event deleted successfully',
        content: {
          'application/json': {
            schema: SingleEventResponseSchema,
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      404: {
          description: 'Event not found'
      },
      500: {
        description: 'Internal server error',
      },
    },
  }),
  async (c: Context<HonoVariable>) => {
    const id = c.req.param('id');
    try {
      const [deletedEvent] = await db
        .delete(events)
        .where(eq(events.id, id))
        .returning();

      if (!deletedEvent) {
        return c.json({ success: false, error: 'Event not found' }, 404);
      }

      return c.json({ 
          success: true, 
          event: {
            ...deletedEvent,
            startDate: deletedEvent.startDate.toISOString(),
            endDate: deletedEvent.endDate.toISOString(),
            createdAt: deletedEvent.createdAt.toISOString(),
            updatedAt: deletedEvent.updatedAt.toISOString(),
          } 
        });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete event',
        },
        500
      );
    }
  }
);

export default eventRoutes;
