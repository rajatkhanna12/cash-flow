import { NextRequest, NextResponse } from 'next/server';
import { getMyAccounts, addMyAccount, deleteMyAccount } from '@/lib/db';

export async function GET() {
  try {
    const accounts = await getMyAccounts();
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.identifier) {
      return NextResponse.json(
        { success: false, error: 'UPI ID or Account Number is required' },
        { status: 400 }
      );
    }

    const created = await addMyAccount({
      name: body.name || 'My Account',
      identifier: body.identifier.trim()
    });

    return NextResponse.json({ success: true, account: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    await deleteMyAccount(id);
    return NextResponse.json({ success: true, message: 'Account removed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
