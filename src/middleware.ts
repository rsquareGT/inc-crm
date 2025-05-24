
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

// Paths accessible without authentication
const PUBLIC_PATHS = ['/login']; 
// API paths that have their own auth logic or are public
const API_PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout']; 
// /api/auth/me is special: it needs to be callable to check session, 
// but handles its own auth. Middleware should let it pass.

async function verifyToken(token: string, secret: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    // Log specific JWT errors for easier debugging if needed
    if (error instanceof jose.errors.JWTExpired) {
      console.info('Middleware: JWT Expired');
    } else if (error instanceof jose.errors.JOSEError) {
      console.info('Middleware: JWT Verification Failed:', error.code);
    } else {
      console.error('Middleware: Unknown JWT Verification Error:', error);
    }
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
  
  // Allow specific public API auth paths like login/logout
  if (API_PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow /api/auth/me to always pass through middleware; it handles its own auth.
  if (pathname.startsWith('/api/auth/me')) {
    return NextResponse.next();
  }

  // Handle public frontend paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (pathname.startsWith('/login') && sessionToken) {
      if (!JWT_SECRET) {
        console.error('JWT_SECRET is not set in middleware for /login redirect check.');
        return NextResponse.next(); 
      }
      const userPayload = await verifyToken(sessionToken, JWT_SECRET);
      if (userPayload) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // For all other paths (protected routes)
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in middleware for protected route.');
    const response = NextResponse.redirect(new URL('/login?error=config_error', request.url));
    response.cookies.delete('session'); // Clear potentially problematic cookie
    return response;
  }

  const userPayload = await verifyToken(sessionToken, JWT_SECRET);

  if (!userPayload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session'); // Clear invalid/expired cookie
    return response;
  }

  // If JWT is valid, allow the request to proceed for protected routes
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
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
