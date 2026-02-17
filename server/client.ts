import { hc } from 'hono/client'

import { env } from '@/lib/env'
import type { AppType } from '@/server'

export const client = hc<AppType>(env.NEXT_PUBLIC_APP_URL)

export type ClientType = typeof client