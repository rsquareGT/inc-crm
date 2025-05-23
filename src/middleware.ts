
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

const PUBLIC_PATHS = ['/login', '/api/auth/login']; // Paths accessible without authentication
const API_AUTH_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/me']; // Auth related API paths

async function verifyToken(token: string, secret: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session')?.value;

  // Allow Next.js specific paths and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Allow public API auth paths
  if (API_AUTH_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Handle public frontend paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // If user is authenticated and tries to access login page, redirect to dashboard
    if (pathname.startsWith('/login') && sessionToken) {
      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not set in middleware for /login redirect check.');
        return NextResponse.next(); // Or handle error appropriately
      }
      const userPayload = await verifyToken(sessionToken, JWT_SECRET);
      if (userPayload) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in middleware for protected route.');
    // Potentially redirect to an error page or login if secret is missing
    return NextResponse.redirect(new URL('/login?error=config_error', request.url));
  }

  const userPayload = await verifyToken(sessionToken, JWT_SECRET);

  if (!userPayload) {
    // Clear invalid cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('session', '', { httpOnly: true, expires: new Date(0), path: '/' });
    return response;
  }

  // If JWT is valid, allow the request to proceed
  // Optionally, you can add user info to headers for backend/server components
  const requestHeaders = new Headers(request.headers);
  if (userPayload.sub) requestHeaders.set('x-user-id', userPayload.sub as string);
  if (userPayload.email) requestHeaders.set('x-user-email', userPayload.email as string);
  if (userPayload.role) requestHeaders.set('x-user-role', userPayload.role as string);
  if (userPayload.organizationId) requestHeaders.set('x-user-organization-id', userPayload.organizationId as string);


  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /images (public images folder if you have one)
     * - /api/ (allow all api routes by default, specific protection done above or within routes) - This will be filtered further by the logic above
     */
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
