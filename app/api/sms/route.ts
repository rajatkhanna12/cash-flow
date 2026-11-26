import { NextRequest, NextResponse } from 'next/server';
import { parseBankSMS } from '@/lib/sms-parser';
import { addTransaction, isDuplicateTransaction, getMyAccounts } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const expectedSecret = process.env.SMS_WEBHOOK_SECRET || 'cf_secret_2026';
    const authHeader = req.headers.get('authorization') || '';
    const apiKeyHeader = req.headers.get('x-api-key') || '';
    const urlKey = req.nextUrl.searchParams.get('key') || '';

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const providedKey = apiKeyHeader || token || urlKey;

    if (expectedSecret && providedKey !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid API key / secret' },
        { status: 401 }
      );
    }

    // 2. Parse Body (Supports JSON or Plain Text)
    let rawText = '';
    let sender = 'Bank/UPI';
    let receivedAt = new Date();

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      rawText = body.text || body.message || body.body || '';
      if (body.sender) sender = body.sender;
      if (body.received_at) {
        const parsedDate = new Date(body.received_at);
        if (!isNaN(parsedDate.getTime())) receivedAt = parsedDate;
      }
    } else {
      rawText = await req.text();
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'No SMS text provided in request' },
        { status: 400 }
      );
    }

    // 3. Load user's own accounts & UPI IDs for Auto Self-Transfer Detection
    const myAccounts = await getMyAccounts();
    const myAccountIdentifiers = myAccounts.map(a => a.identifier);

    // 4. Extract financial details using parser with user's own accounts
    const parsed = parseBankSMS(rawText, receivedAt, myAccountIdentifiers);
    if (!parsed.success || !parsed.amount) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error || 'Failed to parse bank transaction from SMS',
          raw_text: rawText
        },
        { status: 422 }
      );
    }

    // 5. Deduplication Check
    const isDup = await isDuplicateTransaction(parsed.reference, parsed.amount, parsed.merchant);
    if (isDup) {
      return NextResponse.json(
        {
          success: true,
          status: 'duplicate_skipped',
          message: 'Transaction already recorded previously',
          transaction: {
            amount: parsed.amount,
            merchant: parsed.merchant,
            reference: parsed.reference
          }
        },
        { status: 200 }
      );
    }

    // 6. Store in Database
    const savedTx = await addTransaction({
      amount: parsed.amount,
      type: parsed.type || 'outflow',
      category: parsed.category || 'Other Expenses',
      merchant: parsed.merchant || 'Direct Payment',
      account: parsed.account,
      reference: parsed.reference,
      raw_sms: rawText,
      sender,
      date: parsed.date || receivedAt.toISOString()
    });

    return NextResponse.json(
      {
        success: true,
        message: parsed.type === 'transfer' ? 'Self Transfer recorded (excluded from expense)' : 'Transaction recorded successfully',
        transaction: savedTx
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/sms',
    usage: 'Send HTTP POST with JSON body: { "text": "...", "sender": "HDFCBK" } and header: x-api-key'
  });
}
