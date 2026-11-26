import { NextRequest, NextResponse } from 'next/server';
import { getCashFlowStats } from '@/lib/db';
import { ReportingPeriod } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') as ReportingPeriod) || 'month';
    const stats = await getCashFlowStats(period);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
