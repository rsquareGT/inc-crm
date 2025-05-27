
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, RefreshToken as RefreshTokenType } from '@/lib/types';
import * as jose from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_NAME = 'access_token';
const REFRESH_TOKEN_NAME = 'refresh_token';

export async function POST(request: NextRequest) {
  console.log("API Refresh Token: POST request received");

  if (!db) {
    console.error('API Refresh Token: Database connection is not available');
    return NextResponse.json({ error: 'Database connection error.' }, { status: 500 });
  }
  if (!JWT_SECRET) {
    console.error('API Refresh Token: JWT_SECRET is not configured.');
    return NextResponse.json({ error: 'Server configuration error for authentication.' }, { status: 500 });
  }

  const cookieStore = await cookies(); // Use await as per latest guidance
  const receivedRefreshToken = cookieStore.get(REFRESH_TOKEN_NAME)?.value;

  if (!receivedRefreshToken) {
    console.warn('API Refresh Token: No refresh token found in cookies.');
    return NextResponse.json({ error: 'Refresh token missing.' }, { status: 401 });
  }

  try {
    // Find the refresh token in the database. We can't query by the raw token directly
    // as we only store hashes. So we iterate or, for production, use a more complex scheme
    // if many tokens exist. For now, we'll fetch tokens by potential user if we could guess,
    // but since refresh token doesn't carry user ID, we need to iterate or query all.
    // This is NOT scalable for many tokens. A better approach is to include a non-guessable
    // series identifier in the token and query by that, or encrypt user ID in refresh token.
    // For now, we'll simulate a more direct lookup if we had a token ID.
    // Since we don't store raw tokens or have a token ID in the cookie directly, this part is tricky.
    // A common pattern is to have the refresh token cookie store an ID that points to the DB record.
    // Or, the refresh token itself could be a JWT containing its own ID and user ID.

    // Simplified (but less secure/performant) lookup: iterate and compare.
    // THIS IS INEFFICIENT FOR LARGE NUMBERS OF TOKENS.
    const stmtGetAllTokens = db.prepare('SELECT * FROM RefreshTokens');
    const allDbTokens = stmtGetAllTokens.all() as RefreshTokenType[];
    let dbTokenRecord: RefreshTokenType | undefined;
    let matchedUserId: string | undefined;

    for (const tokenRec of allDbTokens) {
      const match = await bcrypt.compare(receivedRefreshToken, tokenRec.tokenHash);
      if (match) {
        dbTokenRecord = tokenRec;
        matchedUserId = tokenRec.userId;
        break;
      }
    }
    
    if (!dbTokenRecord || !matchedUserId) {
      console.warn('API Refresh Token: Refresh token not found in DB or hash mismatch.');
      // Clear potentially compromised/invalid cookies
      const clearResponse = NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 });
      clearResponse.cookies.delete(ACCESS_TOKEN_NAME, { path: '/' });
      clearResponse.cookies.delete(REFRESH_TOKEN_NAME, { path: '/api/auth/refresh-token' });
      return clearResponse;
    }

    // Check if refresh token is expired
    if (new Date(dbTokenRecord.expiresAt) < new Date()) {
      console.warn(`API Refresh Token: Refresh token for user ${matchedUserId} has expired.`);
      db.prepare('DELETE FROM RefreshTokens WHERE id = ?').run(dbTokenRecord.id); // Clean up expired token
      const clearResponse = NextResponse.json({ error: 'Refresh token expired.' }, { status: 401 });
      clearResponse.cookies.delete(ACCESS_TOKEN_NAME, { path: '/' });
      clearResponse.cookies.delete(REFRESH_TOKEN_NAME, { path: '/api/auth/refresh-token' });
      return clearResponse;
    }

    // Refresh token is valid, issue a new access token
    const stmtUser = db.prepare('SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role FROM Users WHERE id = ?');
    const userData = stmtUser.get(matchedUserId) as User | undefined;

    if (!userData) {
      console.error(`API Refresh Token: User ${matchedUserId} not found for valid refresh token. Possible data integrity issue.`);
      // This case should ideally not happen if FK constraints are working.
      db.prepare('DELETE FROM RefreshTokens WHERE id = ?').run(dbTokenRecord.id); // Clean up orphaned token
      const clearResponse = NextResponse.json({ error: 'User associated with token not found.' }, { status: 401 });
      clearResponse.cookies.delete(ACCESS_TOKEN_NAME, { path: '/' });
      clearResponse.cookies.delete(REFRESH_TOKEN_NAME, { path: '/api/auth/refresh-token' });
      return clearResponse;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const alg = 'HS256';
    const accessTokenPayload = { 
      sub: userData.id, 
      email: userData.email, 
      role: userData.role, 
      organizationId: userData.organizationId 
    };
    const newAccessToken = await new jose.SignJWT(accessTokenPayload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(process.env.ACCESS_TOKEN_LIFESPAN_STRING || '15m')
      .sign(secret);

    console.log(`API Refresh Token: New access token generated for user: ${userData.email}`);

    const response = NextResponse.json({ success: true, message: 'Token refreshed successfully.' });
    
    const accessTokenCookieMaxAge = parseInt(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS || '900'); // 15 minutes
    response.cookies.set(ACCESS_TOKEN_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: accessTokenCookieMaxAge,
      path: '/',
      sameSite: 'lax',
    });
    console.log(`API Refresh Token: New access_token cookie set.`);

    // Optional: Implement refresh token rotation here if desired.
    // For now, we are not rotating the refresh token.

    return response;

  } catch (error) {
    console.error('API Refresh Token Error:', error);
    if (error instanceof bcrypt.MISMATCH_ERROR) {
         return NextResponse.json({ error: 'Invalid refresh token.' }, { status: 401 });
    }
    // Generic error, clear cookies as a precaution
    const errorResponse = NextResponse.json({ error: 'An internal server error occurred during token refresh.' }, { status: 500 });
    errorResponse.cookies.delete(ACCESS_TOKEN_NAME, { path: '/' });
    errorResponse.cookies.delete(REFRESH_TOKEN_NAME, { path: '/api/auth/refresh-token' });
    return errorResponse;
  }
}
