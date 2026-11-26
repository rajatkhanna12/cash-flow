import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, addTransaction, deleteTransaction, updateTransaction, clearAllTransactions } from '@/lib/db';
import { ReportingPeriod } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') as ReportingPeriod | undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const transactions = await getTransactions(period || undefined, startDate, endDate);
    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.amount || !body.type || !body.merchant) {
      return NextResponse.json(
        { success: false, error: 'Amount, type, and merchant are required' },
        { status: 400 }
      );
    }

    const tx = await addTransaction({
      amount: parseFloat(body.amount),
      type: body.type,
      category: body.type === 'transfer' ? 'Self Transfer' : (body.category || 'Other Expenses'),
      merchant: body.merchant,
      account: body.account || 'Manual Entry',
      reference: body.reference,
      date: body.date || new Date().toISOString(),
      notes: body.notes
    });

    return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const updated = await updateTransaction(body.id, body.updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('all') === 'true';
    if (clearAll) {
      await clearAllTransactions();
      return NextResponse.json({ success: true, message: 'Server data completely wiped' });
    }

    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    await deleteTransaction(id);
    return NextResponse.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
