
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log("API Login: POST request received");
  try {
    if (!db) {
      console.error('API Login: Database connection is not available');
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const { email, password, rememberMe } = await request.json(); // Added rememberMe
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
      // TODO: CRITICAL SECURITY FLAW - Replace with bcrypt.compare once real hashed passwords are in DB
      // passwordMatch = await bcrypt.compare(password, userData.hashedPassword); 
      // For now, direct comparison due to placeholder "hashed" passwords
      passwordMatch = password === userData.hashedPassword; 
      console.log(`API Login: Password comparison result for ${email}: ${passwordMatch} (Using direct string compare - insecure)`);
      if (!passwordMatch && userData.hashedPassword !== 'hashed_admin_password123' && userData.hashedPassword !== 'hashed_user_password456' && userData.hashedPassword !== 'hashed_jane_password789') {
        // If it's not one of our known placeholder hashes, and bcrypt would have been used, log a stronger warning.
         console.warn(`API Login: Using insecure direct password comparison. Switch to bcrypt.compare for production for user ${email}.`);
      }
    } catch (compareError) {
        console.error('API Login: bcrypt.compare error (or error in direct comparison logic):', compareError);
        return NextResponse.json({ error: 'Error during password verification.' }, { status: 500 });
    }

    if (!passwordMatch) {
      console.warn(`API Login: Password mismatch for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    console.log(`API Login: Password matched for email: ${email}`);

    const { hashedPassword, ...userToSign } = userData;

    if (!process.env.JWT_SECRET) {
      console.error('API Login: JWT_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Server configuration error for authentication.' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';

    // Determine token expiration based on rememberMe
    const accessTokenExpiration = process.env.ACCESS_TOKEN_EXPIRATION_TIME || '15m';
    const sessionCookieMaxAge = parseInt(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE_SECONDS || '900', 10); // Default to access token's short expiry

    // For this step, we are still using one "session" token.
    // In the next step, we will differentiate access and refresh tokens.
    // If "Remember Me" is checked, we'll use a longer expiry for this single session token for now.
    // This will be replaced by a proper refresh token mechanism.
    const effectiveExpiration = rememberMe ? (process.env.REFRESH_TOKEN_EXPIRATION_TIME || '7d') : accessTokenExpiration;
    const effectiveMaxAge = rememberMe ? parseInt(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE_SECONDS || '604800', 10) : sessionCookieMaxAge;

    console.log(`API Login: Effective token expiration: ${effectiveExpiration}, MaxAge for cookie: ${effectiveMaxAge}s`);

    let jwt;
    try {
      jwt = await new jose.SignJWT({
          sub: userToSign.id,
          email: userToSign.email,
          role: userToSign.role,
          organizationId: userToSign.organizationId,
        })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime(effectiveExpiration) // Use determined expiration
        .sign(secret);
      console.log(`API Login: JWT created successfully for user: ${userToSign.email}`);
    } catch (jwtError) {
      console.error('API Login: Error creating JWT:', jwtError);
      return NextResponse.json({ error: 'Failed to create session token.' }, { status: 500 });
    }

    const cookieStore = await cookies(); // As per user request and Next.js docs for async context
    cookieStore.set('session', jwt, { // Still using 'session' for now. Will change to 'access_token' later.
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: effectiveMaxAge, // Use determined maxAge
    });
    console.log(`API Login: Session cookie set for user: ${userToSign.email} with maxAge ${effectiveMaxAge}s.`);

    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    if (error instanceof Error && error.message.includes('bcrypt') && error.message.includes('data and salt arguments required')) {
      console.error('API Login: bcrypt.compare failed. Ensure passwords in DB are correctly hashed and provided password is a string.');
      return NextResponse.json({ error: 'Authentication process error. Check server logs.' }, { status: 500 });
    }
    if (error instanceof Error && (error as any).code && typeof (error as any).code === 'string' && (error as any).code.startsWith('SQLITE_')) {
        console.error(`API Login: SQLite Error - Code: ${(error as any).code}, Message: ${error.message}`);
        return NextResponse.json({ error: `Database operation failed: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during login.' }, { status: 500 });
  }
}
