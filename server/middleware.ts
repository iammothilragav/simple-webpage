import { Context, Hono, Next } from 'hono';
import { auth } from '@/lib/auth';

export type HonoVariable = {
  Variables: {
    user: typeof auth.$Infer.Session.user
    session: typeof auth.$Infer.Session.session
  }
}

export const authMiddleware = async (c:Context<HonoVariable>, next:Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};
