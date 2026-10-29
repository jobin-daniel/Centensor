import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth / Auth.js session cookies
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isLoggedIn = Boolean(sessionToken);
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isApiAuth = pathname.startsWith('/api/auth') || pathname.startsWith('/api/health');

  // Allow auth and public health APIs freely
  if (isApiAuth) {
    return NextResponse.next();
  }

  // If already logged in and visiting /login or /register, redirect to home
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If not logged in and trying to access protected routes, redirect to /login
  if (!isLoggedIn && !isAuthRoute) {
    // If it's an API route other than /api/auth, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
