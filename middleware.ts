import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired
  await supabase.auth.getSession();
  
  // Continue with the response
  return res;
}

export const config = {
  // Skip static files and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};