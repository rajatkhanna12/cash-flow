import { NextRequest, NextResponse } from 'next/server';
import { verifyPinOrPassword, AUTH_COOKIE_NAME, AUTH_TOKEN_SECRET, isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authed = isAuthenticated(req);
  return NextResponse.json({ authenticated: authed });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ success: false, error: 'Passcode / PIN required' }, { status: 400 });
    }

    const isValid = verifyPinOrPassword(password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Galat PIN / Password! Dobara try karein.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: AUTH_TOKEN_SECRET
    });

    // 30 days session
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: AUTH_TOKEN_SECRET,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0
  });
  return response;
}
