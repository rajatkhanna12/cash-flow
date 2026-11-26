import { setVapidDetails, sendNotification } from 'web-push';
import fs from 'fs';
import path from 'path';
import { getCashFlowStats } from './db';

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

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data', 'push_subscriptions.json');

function ensureFile() {
  try {
    const dir = path.dirname(SUBSCRIPTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify([]));
    }
  } catch {}
}

export async function getPushSubscriptions(): Promise<PushSubscriptionItem[]> {
  ensureFile();
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {}
  return [];
}

export async function savePushSubscription(sub: any): Promise<boolean> {
  if (!sub || !sub.endpoint || !sub.keys) return false;
  ensureFile();

  const current = await getPushSubscriptions();
  const filtered = current.filter(s => s.endpoint !== sub.endpoint);
  filtered.push({
    id: `sub-${Date.now()}`,
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth
    },
    created_at: new Date().toISOString()
  });

  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(filtered, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  ensureFile();
  const current = await getPushSubscriptions();
  const filtered = current.filter(s => s.endpoint !== endpoint);
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(filtered, null, 2));
    return true;
  } catch {
    return false;
  }
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
