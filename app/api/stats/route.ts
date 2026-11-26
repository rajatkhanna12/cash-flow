import { NextResponse } from 'next/server';
import { getCashFlowStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = await getCashFlowStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
