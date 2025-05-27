
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import crypto from 'crypto'; // For generating secure random string
import { generateId } from '@/lib/utils'; // For RefreshTokens table PK

export async function POST(request: NextRequest) {
  console.log("API Login: POST request received");
  try {
    if (!db) {
      console.error('API Login: Database connection is not available');
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const { email, password, rememberMe = false } = await request.json();
    console.log(`API Login: Attempting login for email: ${email}, rememberMe: ${rememberMe}`);

    if (!email || !password) {
      console.warn('API Login: Email or password missing from request');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const stmtUser = db.prepare('SELECT id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM Users WHERE email = ?');
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      console.warn(`API Login: User not found or no hashed password for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, userData.hashedPassword);
      console.log(`API Login: Password comparison result for ${email}: ${passwordMatch}`);
    } catch (compareError) {
        console.error('API Login: bcrypt.compare error:', compareError);
        return NextResponse.json({ error: 'Error during password verification.' }, { status: 500 });
    }

    if (!passwordMatch) {
      console.warn(`API Login: Password mismatch for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    console.log(`API Login: Password matched for email: ${email}`);

    const { hashedPassword, ...userToReturn } = userData;

    if (!process.env.JWT_SECRET) {
      console.error('API Login: JWT_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Server configuration error for authentication.' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';

    // 1. Generate Access Token (JWT)
    const accessTokenPayload = { 
      sub: userToReturn.id, 
      email: userToReturn.email, 
      role: userToReturn.role, 
      organizationId: userToReturn.organizationId 
    };
    const accessToken = await new jose.SignJWT(accessTokenPayload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(process.env.ACCESS_TOKEN_LIFESPAN_STRING || '15m')
      .sign(secret);
    console.log(`API Login: Access Token generated for user: ${userToReturn.email}`);

    // 2. Generate Refresh Token (Secure Random String)
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const saltRounds = 10;
    const hashedRefreshTokenForDB = await bcrypt.hash(rawRefreshToken, saltRounds);
    const refreshTokenId = generateId(); // For RefreshTokens table PK

    const refreshTokenDbLifespanSeconds = rememberMe
      ? parseInt(process.env.LONG_REFRESH_TOKEN_DB_LIFESPAN_SECONDS || '604800') // Default 7 days
      : parseInt(process.env.SHORT_REFRESH_TOKEN_DB_LIFESPAN_SECONDS || '86400'); // Default 1 day
      
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenDbLifespanSeconds * 1000);

    // 3. Store Hashed Refresh Token in DB
    try {
        const stmtDeleteOldRefreshTokens = db.prepare('DELETE FROM RefreshTokens WHERE userId = ?');
        stmtDeleteOldRefreshTokens.run(userToReturn.id); // Clear any old refresh tokens for this user

        const stmtInsertRefreshToken = db.prepare(
            'INSERT INTO RefreshTokens (id, userId, tokenHash, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)'
        );
        stmtInsertRefreshToken.run(refreshTokenId, userToReturn.id, hashedRefreshTokenForDB, refreshTokenExpiresAt.toISOString(), new Date().toISOString());
        console.log(`API Login: Refresh Token stored in DB for user: ${userToReturn.id}`);
    } catch (dbError) {
        console.error('API Login: Error storing refresh token in DB:', dbError);
        return NextResponse.json({ error: 'Failed to establish a secure session.' }, { status: 500 });
    }
    
    // 4. Set Cookies
    const cookieStore = await cookies();

    const accessTokenCookieMaxAge = parseInt(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS || '900'); // 15 minutes
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: accessTokenCookieMaxAge,
      path: '/',
      sameSite: 'lax',
    });
    console.log(`API Login: access_token cookie set with maxAge ${accessTokenCookieMaxAge}s.`);

    const refreshTokenCookieMaxAge = rememberMe
        ? parseInt(process.env.LONG_REFRESH_TOKEN_COOKIE_MAX_AGE_SECONDS || '604800') // 7 days
        : parseInt(process.env.SHORT_REFRESH_TOKEN_COOKIE_MAX_AGE_SECONDS || '86400'); // 1 day

    cookieStore.set('refresh_token', rawRefreshToken, { // Store the raw token in cookie
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: refreshTokenCookieMaxAge,
      path: '/api/auth/refresh-token', // IMPORTANT: Restrict path to refresh endpoint only
      sameSite: 'strict', 
    });
    console.log(`API Login: refresh_token cookie set with maxAge ${refreshTokenCookieMaxAge}s for path /api/auth/refresh-token.`);

    // Remove old 'session' cookie if it exists, as we are now using access_token and refresh_token
    if (cookieStore.has('session')) {
      console.log("API Login: Old 'session' cookie found, deleting it.");
      cookieStore.delete('session');
    }

    return NextResponse.json({ success: true, user: userToReturn });

  } catch (error) {
    console.error('API Login Error:', error);
    if (error instanceof Error && (error as any).code && typeof (error as any).code === 'string' && (error as any).code.startsWith('SQLITE_')) {
        console.error(`API Login: SQLite Error - Code: ${(error as any).code}, Message: ${error.message}`);
        return NextResponse.json({ error: `Database operation failed: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during login.' }, { status: 500 });
  }
}
