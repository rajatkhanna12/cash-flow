import { NextRequest } from 'next/server';

export const DEFAULT_APP_USERNAME = process.env.APP_USERNAME || 'Admin';
export const DEFAULT_APP_PASSWORD = process.env.APP_PASSWORD || 'Khanna@3927';
export const AUTH_COOKIE_NAME = 'cfg_auth_session';
export const AUTH_TOKEN_SECRET = process.env.AUTH_SECRET || 'cfg_auth_token_secret_vault_2026';

export function verifyCredentials(username?: string, password?: string): boolean {
  if (!username || !password) return false;
  const targetUser = (process.env.APP_USERNAME || DEFAULT_APP_USERNAME).trim().toLowerCase();
  const targetPass = (process.env.APP_PASSWORD || DEFAULT_APP_PASSWORD).trim();

  return username.trim().toLowerCase() === targetUser && password.trim() === targetPass;
}

export function isAuthenticated(req: NextRequest): boolean {
  // 1. Check HTTP-only cookie
  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie && cookie === AUTH_TOKEN_SECRET) {
    return true;
  }

  // 2. Check Authorization header or x-auth-token
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || req.headers.get('x-auth-token');
  if (authHeader && authHeader === AUTH_TOKEN_SECRET) {
    return true;
  }

  return false;
}
