
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log("API Login: POST request received");
  try {
    // Check if db connection is available
    if (!db) {
      console.error('API Login: Database connection is not available');
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    // console.log('API Login: db object:', db); // For debugging what db object contains

    const { email, password } = await request.json();

    if (!email || !password) {
      console.warn('API Login: Email or password missing from request');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    console.log(`API Login: Attempting login for email: ${email}`);
    const stmtUser = db.prepare('SELECT id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM User WHERE email = ?');
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      console.warn(`API Login: User not found or no hashed password for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    let passwordMatch = false;
    try {
      // TODO: CRITICAL SECURITY FLAW - This was intended to be replaced by bcrypt.compare.
      // If passwords in DB are not yet bcrypt hashed, this will fail.
      // Ensure passwords in DB are properly hashed with bcrypt.
      // For example:
      // const realHashedPasswordFromDB = "$2b$10$...."; // Actual hash from DB
      // passwordMatch = await bcrypt.compare(password, realHashedPasswordFromDB);
      
      // Placeholder for direct string comparison if using non-bcrypt "hashed" passwords
      // passwordMatch = (password === userData.hashedPassword);

      // Assuming bcrypt is now in use:
      passwordMatch = await bcrypt.compare(password, userData.hashedPassword);
      console.log(`API Login: bcrypt.compare result for ${email}: ${passwordMatch}`);
    } catch (compareError) {
        console.error('API Login: bcrypt.compare error:', compareError);
        // This can happen if userData.hashedPassword is not a valid bcrypt hash
        return NextResponse.json({ error: 'Error during password verification. Ensure password in DB is a valid bcrypt hash.' }, { status: 500 });
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
        .setExpirationTime(process.env.JWT_EXPIRATION_TIME || '1h')
        .sign(secret);
      console.log(`API Login: JWT created successfully for user: ${userToSign.email}`);
    } catch (jwtError) {
      console.error('API Login: Error creating JWT:', jwtError);
      return NextResponse.json({ error: 'Failed to create session token.' }, { status: 500 });
    }

    const maxAgeSeconds = parseInt(process.env.JWT_MAX_AGE_SECONDS || '3600', 10);

    // Use cookies() from next/headers to set the cookie
    const cookieStore = await cookies(); // await if cookies() is async for write ops
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
    });
    console.log(`API Login: Session cookie set for user: ${userToSign.email} via next/headers cookies().set`);

    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    // Specific check for bcrypt errors (e.g., if password or hash is malformed)
    if (error instanceof Error && error.message.includes('data and salt arguments required') && error.message.includes('bcrypt')) {
      console.error('API Login: bcrypt.compare failed. Ensure passwords in DB are correctly hashed and provided password is a string.');
      return NextResponse.json({ error: 'Authentication process error. Check server logs.' }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes('data and salt arguments required')) { // General check for this error type
      return NextResponse.json({ error: 'Invalid input for password comparison.' }, { status: 400 });
    }
    // Check if it's an SQLite error
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('SQLITE_')) {
        console.error(`API Login: SQLite Error - Code: ${error.code}, Message: ${error.message}`);
        return NextResponse.json({ error: `Database operation failed: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during login.' }, { status: 500 });
  }
}
