import { NextRequest, NextResponse } from 'next/server';

export const DEFAULT_AUTH_PIN = process.env.APP_PIN || process.env.APP_PASSWORD || '2026';
export const AUTH_COOKIE_NAME = 'cfg_auth_session';
export const AUTH_TOKEN_SECRET = process.env.AUTH_SECRET || 'cfg_auth_token_secret_vault_2026';

export function verifyPinOrPassword(input: string): boolean {
  if (!input) return false;
  const target = (process.env.APP_PIN || process.env.APP_PASSWORD || DEFAULT_AUTH_PIN).trim();
  return input.trim() === target;
}

export function isAuthenticated(req: NextRequest): boolean {
  // Check cookie
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie && cookie === AUTH_TOKEN_SECRET) {
    return true;
  }

  // Check Authorization header or x-auth-token
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || req.headers.get('x-auth-token');
  if (authHeader && authHeader === AUTH_TOKEN_SECRET) {
    return true;
  }

  return false;
}
