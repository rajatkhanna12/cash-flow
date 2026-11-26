import { NextRequest, NextResponse } from 'next/server';
import { getBudgets, saveBudgets } from '@/lib/db';

export async function GET() {
  try {
    const budgets = await getBudgets();
    return NextResponse.json({ success: true, budgets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.budgets)) {
      return NextResponse.json({ success: false, error: 'Expected budgets array' }, { status: 400 });
    }
    const updated = await saveBudgets(body.budgets);
    return NextResponse.json({ success: true, budgets: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
