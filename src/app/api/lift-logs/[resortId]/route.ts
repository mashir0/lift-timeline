import { fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/api/lift-logs/:resortId', async (c) => {
  const resortId = parseInt(c.req.param('resortId'));
  const date = c.req.query('date');

  if (!date) {
    return c.json({ error: 'Date parameter is required' }, 400);
  }

  if (isNaN(resortId)) {
    return c.json({ error: 'Invalid resort ID' }, 400);
  }

  try {
    const liftLogs = await fetchOneDayLiftLogs(resortId, date);
    return c.json(liftLogs);
  } catch (error) {
    console.error('Error fetching lift logs:', error);
    return c.json({ error: 'Failed to fetch lift logs' }, 500);
  }
});

export const GET = handle(app);
export const runtime = 'edge'; 