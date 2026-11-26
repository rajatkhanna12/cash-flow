import { setVapidDetails, sendNotification } from 'web-push';
import fs from 'fs';
import path from 'path';
import {
  getCashFlowStats,
  savePushSubscriptionDb,
  getPushSubscriptionsDb,
  deletePushSubscriptionDb
} from './db';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BObnb8b6OnqYOiWWPQG5UhaPFDtNa2ubjR3iv26BHfxJnrpPdsBDfL8pXKgqh_6CH3hYW_Jvnqhn75re4Dcy8G0';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'GNIvmFGNaWjJHYDsVz0cYY871eer9t-H8DizDxPWaN0';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:rajatkhanna.netdeveloper@gmail.com';

setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushSubscriptionItem {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const RUNTIME_DIR = IS_SERVERLESS ? '/tmp' : path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(RUNTIME_DIR, 'push_subscriptions.json');

// In-memory cache for fast local access
let inMemorySubscriptions: PushSubscriptionItem[] = [];

function ensureFile() {
  try {
    if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([]));
    }
  } catch {}
}

export async function getPushSubscriptions(): Promise<PushSubscriptionItem[]> {
  // 1. Try Database (Postgres / MSSQL)
  try {
    const dbSubs = await getPushSubscriptionsDb();
    if (dbSubs !== null) {
      return dbSubs.map(s => ({
        id: s.id,
        endpoint: s.endpoint,
        keys: s.keys,
        created_at: s.created_at || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.error('Error fetching push subs from DB:', err);
  }

  // 2. Fallback to /tmp or data file
  ensureFile();
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemorySubscriptions = parsed;
        return parsed;
      }
    }
  } catch {}

  return inMemorySubscriptions;
}

export async function savePushSubscription(sub: any): Promise<boolean> {
  if (!sub || !sub.endpoint || !sub.keys) return false;

  // 1. Try Database first
  try {
    const savedInDb = await savePushSubscriptionDb(sub);
    if (savedInDb) {
      console.log('Push subscription saved to database');
    }
  } catch (err) {
    console.error('Error saving push subscription to DB:', err);
  }

  // 2. Also keep in local runtime storage (/tmp on serverless) and in-memory
  ensureFile();
  const current = inMemorySubscriptions.filter(s => s.endpoint !== sub.endpoint);
  current.push({
    id: `sub-${Date.now()}`,
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    },
    created_at: new Date().toISOString()
  });
  inMemorySubscriptions = current;

  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(current, null, 2));
  } catch (err) {
    console.error('File write error for subscriptions:', err);
  }

  return true;
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  // 1. Database removal
  try {
    await deletePushSubscriptionDb(endpoint);
  } catch (err) {
    console.error('Error deleting push sub from DB:', err);
  }

  // 2. Local file and memory removal
  ensureFile();
  inMemorySubscriptions = inMemorySubscriptions.filter(s => s.endpoint !== endpoint);
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(inMemorySubscriptions, null, 2));
  } catch {}
  return true;
}

export async function sendDailySummaryPush(customTitle?: string, customBody?: string) {
  const subscriptions = await getPushSubscriptions();
  if (subscriptions.length === 0) {
    return { success: false, error: 'No active push subscriptions found' };
  }

  // Calculate today's stats
  const stats = await getCashFlowStats('today');
  const outflow = stats.totalOutflow || 0;
  const inflow = stats.totalInflow || 0;
  const count = stats.transactionCount || 0;

  // Find top spending category
  let topCategory = '';
  let topSpent = 0;
  for (const [cat, spent] of Object.entries(stats.categorySpending || {})) {
    if (spent > topSpent) {
      topSpent = spent;
      topCategory = cat;
    }
  }

  const title = customTitle || '🌙 Aaj Ka Kharch Report';
  let body = customBody;
  if (!body) {
    if (outflow > 0) {
      body = `💸 Aaj ka kharch: ₹${outflow.toLocaleString('en-IN')} (${count} txns) • 🟢 Aaya: ₹${inflow.toLocaleString('en-IN')}${topCategory ? ` • Top: ${topCategory}` : ''}. Tap to review.`;
    } else if (inflow > 0) {
      body = `🟢 Aaj koi kharch nahi hua! Kul Aaya: ₹${inflow.toLocaleString('en-IN')}. Good job!`;
    } else {
      body = `✨ Aaj koi kharch nahi hua! Zero spending day. Peace of mind!`;
    }
  }

  const payload = JSON.stringify({
    title,
    body,
    url: '/'
  });

  const results = await Promise.allSettled(
    subscriptions.map(async sub => {
      try {
        await sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth
            }
          },
          payload
        );
        return { endpoint: sub.endpoint, status: 'delivered' };
      } catch (err: any) {
        // If subscription has expired or unsubscribed, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removePushSubscription(sub.endpoint);
        }
        throw err;
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return {
    success: true,
    total: subscriptions.length,
    delivered: successful,
    failed,
    summary: { outflow, inflow, count, topCategory }
  };
}
