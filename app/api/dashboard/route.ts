import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, getCashFlowStats, getBudgets, getMyAccounts } from '@/lib/db';
import { ReportingPeriod } from '@/lib/types';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') as ReportingPeriod) || 'month';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Fetch all 4 in parallel in a single server process
    const [transactions, stats, budgets, myAccounts] = await Promise.all([
      getTransactions(period, startDate, endDate),
      getCashFlowStats(period, startDate, endDate),
      getBudgets(),
      getMyAccounts()
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      stats,
      budgets,
      accounts: myAccounts
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
