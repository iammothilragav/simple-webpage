import { hc } from 'hono/client';
import { AppType } from '@/server/app';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '';
    if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
    return 'http://localhost:3000';
};

// Create a type-safe RPC client
export const client = hc<AppType>(getBaseUrl());
