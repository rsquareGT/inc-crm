import { NextResponse, type NextRequest } from "next/server";
import * as jose from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_NAME = "access_token"; // Use a constant

// Paths accessible without authentication
const PUBLIC_PAGE_PATHS = ["/login"];
// API paths that are public or handle their own auth for specific flows
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout"];
const REFRESH_TOKEN_PATH = "/api/auth/refresh-token";
// /api/auth/me is special: it needs to be callable to check session,
// but relies on the access_token.

const ADMIN_PAGE_PATHS = ["/admin", "/organization/profile"];

async function verifyToken(token: string, secret: string): Promise<jose.JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      console.info("Middleware: Access Token Expired");
    } else if (error instanceof jose.errors.JOSEError) {
      console.info("Middleware: Access Token Verification Failed:", error.code);
    } else {
      console.error("Middleware: Unknown Access Token Verification Error:", error);
    }
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_NAME)?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  let userPayload: jose.JWTPayload | null = null;

  console.log(`Middleware: Processing request for ${pathname}`);

  // Special handling for refresh token endpoint
  if (pathname.startsWith(REFRESH_TOKEN_PATH)) {
    // Only allow POST method for refresh token endpoint
    if (request.method !== "POST") {
      return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    }

    // Require refresh token for this endpoint
    if (!refreshToken) {
      console.warn("Middleware: Refresh token endpoint called without refresh token");
      return NextResponse.json({ error: "Refresh token required" }, { status: 401 });
    }

    // Allow the request to proceed to the refresh endpoint
    return NextResponse.next();
  }

  // Allow Next.js specific paths and static files
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Allow specific public API auth paths
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    console.log(`Middleware: Allowing public API path: ${pathname}`);
    return NextResponse.next();
  }

  if (!JWT_SECRET) {
    console.error("Middleware: JWT_SECRET is not configured on the server.");
    if (
      !PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p)) &&
      !pathname.startsWith("/api/auth")
    ) {
      // Only redirect if not already on a public page or auth API, to prevent redirect loops
      const response = NextResponse.redirect(new URL("/login?error=config_error", request.url));
      cookieStore.delete(ACCESS_TOKEN_NAME);
      // Also clear refresh_token if it exists
      if (cookieStore.has("refresh_token")) {
        cookieStore.delete("refresh_token"); // Delete the cookie with default options
      }
      return response;
    }
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  if (accessToken) {
    userPayload = await verifyToken(accessToken, JWT_SECRET);
    if (!userPayload && pathname !== REFRESH_TOKEN_PATH) {
      // Access token is invalid/expired and we're not already trying to refresh
      // Let the client handle the 401 and attempt refresh
      console.log(`Middleware: Invalid/expired access token, client should handle refresh`);
    }
  } else {
    console.log(`Middleware: No access token found.`);
  }

  // Handle public frontend pages
  if (PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/login") && userPayload) {
      // User has valid access token, trying to access login
      console.log(`Middleware: Authenticated user accessing /login, redirecting to /dashboard`);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    console.log(`Middleware: Allowing public page path: ${pathname}`);
    return NextResponse.next();
  }

  // For all other protected paths (pages or APIs not explicitly public)
  if (!userPayload) {
    // If it's an API route (and not /api/auth/me which needs special handling below)
    // let it pass through. The API route itself should return 401.
    // The client will then attempt to refresh the token.
    if (pathname.startsWith("/api/") && pathname !== "/api/auth/me") {
      console.log(
        `Middleware: No valid access token for API route ${pathname}. Allowing request for API to handle auth.`
      );
      return NextResponse.next();
    }
    // Special handling for /api/auth/me when called from login page
    if (pathname === "/api/auth/me") {
      const referer = request.headers.get("referer");
      if (referer?.includes("/login")) {
        console.log("Middleware: Allowing /api/auth/me request from login page");
        return NextResponse.next();
      }
    }
    // If it's a page route or /api/auth/me without a valid token
    console.log(
      `Middleware: No valid access token for protected path ${pathname}. Redirecting to /login.`
    );
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Clear potentially invalid access_token. Refresh token is handled by refresh_token endpoint or login.
    cookieStore.delete(ACCESS_TOKEN_NAME);
    return response;
  }

  // User is authenticated (userPayload is not null)

  // Admin-only route protection
  if (ADMIN_PAGE_PATHS.some((p) => pathname.startsWith(p)) && userPayload.role !== "admin") {
    console.log(
      `Middleware: Non-admin user (role: ${userPayload.role}) attempting to access admin path ${pathname}. Redirecting to /dashboard.`
    );
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Inject user details into request headers for backend services
  const headers: { [key: string]: string } = {};
  if (userPayload.sub) headers["x-user-id"] = userPayload.sub as string;
  if (userPayload.email) headers["x-user-email"] = userPayload.email as string;
  if (userPayload.role) headers["x-user-role"] = userPayload.role as string;
  if (userPayload.organizationId)
    headers["x-user-organization-id"] = userPayload.organizationId as string;

  console.log(`Middleware: Forwarding request for ${pathname} with user headers.`);
  return NextResponse.next({
    headers,
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
