import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, addTransaction, deleteTransaction } from '@/lib/db';

export async function GET() {
  try {
    const transactions = await getTransactions();
    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
      category: body.category || 'Other Expenses',
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
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
