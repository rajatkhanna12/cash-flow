import { NextRequest, NextResponse } from 'next/server';
import {
  VAPID_PUBLIC_KEY,
  savePushSubscription,
  removePushSubscription,
  sendDailySummaryPush,
  getPushSubscriptions
} from '@/lib/push';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authed = isAuthenticated(req);
  const subs = await getPushSubscriptions();

  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
    totalSubscriptions: subs.length,
    authenticated: authed
  });
}

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Invalid subscription object' }, { status: 400 });
    }

    const saved = await savePushSubscription(subscription);
    return NextResponse.json({ success: saved, message: 'Push subscription registered successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || req.headers.get('x-api-key');
    const isCronKeyValid = key === 'cf_secret_2026';
    const isUserAuthed = isAuthenticated(req);

    if (!isCronKeyValid && !isUserAuthed) {
      return NextResponse.json({ success: false, error: 'Unauthorized to trigger notifications' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await sendDailySummaryPush(body.title, body.body);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint required' }, { status: 400 });
    }
    const removed = await removePushSubscription(endpoint);
    return NextResponse.json({ success: removed, message: 'Unsubscribed successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
