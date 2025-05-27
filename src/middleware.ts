
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_NAME = 'access_token'; // Use a constant

// Paths accessible without authentication
const PUBLIC_PAGE_PATHS = ['/login'];
// API paths that are public or handle their own auth for specific flows
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh-token'];
// /api/auth/me is special: it needs to be callable to check session,
// but relies on the access_token.

const ADMIN_PAGE_PATHS = ['/admin', '/organization/profile'];

async function verifyToken(token: string, secret: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      console.info('Middleware: Access Token Expired');
    } else if (error instanceof jose.errors.JOSEError) {
      console.info('Middleware: Access Token Verification Failed:', error.code);
    } else {
      console.error('Middleware: Unknown Access Token Verification Error:', error);
    }
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_NAME)?.value;
  let userPayload: jose.JWTPayload | null = null;

  console.log(`Middleware: Processing request for ${pathname}`);

  // Allow Next.js specific paths and static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Allow specific public API auth paths
  if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
    console.log(`Middleware: Allowing public API path: ${pathname}`);
    return NextResponse.next();
  }

  if (!JWT_SECRET) {
    console.error('Middleware: JWT_SECRET is not configured on the server.');
    if (!PUBLIC_PAGE_PATHS.some(p => pathname.startsWith(p)) && !pathname.startsWith('/api/auth')) {
        // Only redirect if not already on a public page or auth API, to prevent redirect loops
        const response = NextResponse.redirect(new URL('/login?error=config_error', request.url));
        response.cookies.delete(ACCESS_TOKEN_NAME);
        // Also clear refresh_token if it exists
        if (request.cookies.has('refresh_token')) {
            response.cookies.delete('refresh_token', { path: '/api/auth/refresh-token' });
        }
        return response;
    }
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  if (accessToken) {
    userPayload = await verifyToken(accessToken, JWT_SECRET);
    if (userPayload) {
      console.log(`Middleware: Valid access token found for user: ${userPayload.email}`);
    } else {
      console.log(`Middleware: Invalid or expired access token found.`);
      // Don't delete cookie here yet, client might refresh
    }
  } else {
    console.log(`Middleware: No access token found.`);
  }

  // Handle public frontend pages
  if (PUBLIC_PAGE_PATHS.some(p => pathname.startsWith(p))) {
    if (pathname.startsWith('/login') && userPayload) { // User has valid access token, trying to access login
      console.log(`Middleware: Authenticated user accessing /login, redirecting to /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log(`Middleware: Allowing public page path: ${pathname}`);
    return NextResponse.next();
  }

  // For all other protected paths (pages or APIs not explicitly public)
  if (!userPayload) {
    // If it's an API route (and not /api/auth/me which needs special handling below)
    // let it pass through. The API route itself should return 401.
    // The client will then attempt to refresh the token.
    if (pathname.startsWith('/api/') && pathname !== '/api/auth/me') {
        console.log(`Middleware: No valid access token for API route ${pathname}. Allowing request for API to handle auth.`);
        return NextResponse.next();
    }
    // If it's a page route or /api/auth/me without a valid token
    console.log(`Middleware: No valid access token for protected path ${pathname}. Redirecting to /login.`);
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear potentially invalid access_token. Refresh token is handled by refresh_token endpoint or login.
    response.cookies.delete(ACCESS_TOKEN_NAME);
    return response;
  }

  // User is authenticated (userPayload is not null)

  // Admin-only route protection
  if (ADMIN_PAGE_PATHS.some(p => pathname.startsWith(p)) && userPayload.role !== 'admin') {
    console.log(`Middleware: Non-admin user (role: ${userPayload.role}) attempting to access admin path ${pathname}. Redirecting to /dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Inject user details into request headers for backend services
  const requestHeaders = new Headers(request.headers);
  if (userPayload.sub) requestHeaders.set('x-user-id', userPayload.sub as string);
  if (userPayload.email) requestHeaders.set('x-user-email', userPayload.email as string);
  if (userPayload.role) requestHeaders.set('x-user-role', userPayload.role as string);
  if (userPayload.organizationId) requestHeaders.set('x-user-organization-id', userPayload.organizationId as string);
  
  console.log(`Middleware: Forwarding request for ${pathname} with user headers.`);
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
