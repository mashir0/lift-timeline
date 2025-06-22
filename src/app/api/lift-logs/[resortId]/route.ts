import { fetchOneDayLiftLogs } from '@/lib/supabaseDto';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/api/lift-logs/:resortId', async (c) => {
  const startTime = Date.now();
  const resortId = parseInt(c.req.param('resortId'));
  const date = c.req.query('date');

  console.log(`🚀 [API] /api/lift-logs/${resortId} 開始:`, {
    resortId,
    date,
    timestamp: new Date().toISOString()
  });

  if (!date) {
    console.log(`❌ [API] /api/lift-logs/${resortId} エラー: Date parameter is required`);
    return c.json({ error: 'Date parameter is required' }, 400);
  }

  if (isNaN(resortId)) {
    console.log(`❌ [API] /api/lift-logs/${resortId} エラー: Invalid resort ID`);
    return c.json({ error: 'Invalid resort ID' }, 400);
  }

  try {
    console.log(`🔄 [API] /api/lift-logs/${resortId} fetchOneDayLiftLogs 開始`);
    const fetchStart = Date.now();
    const liftLogs = await fetchOneDayLiftLogs(resortId, date);
    console.log(`✅ [API] /api/lift-logs/${resortId} fetchOneDayLiftLogs 完了:`, {
      dataSize: Object.keys(liftLogs.liftLogs).length,
      duration: Date.now() - fetchStart,
      unit: 'ms'
    });
    
    console.log(`🎉 [API] /api/lift-logs/${resortId} 全処理完了:`, {
      totalDuration: Date.now() - startTime,
      unit: 'ms'
    });
    
    return c.json(liftLogs);
  } catch (error) {
    console.error(`❌ [API] /api/lift-logs/${resortId} Error fetching lift logs:`, error);
    return c.json({ error: 'Failed to fetch lift logs' }, 500);
  }
});

export const GET = handle(app);