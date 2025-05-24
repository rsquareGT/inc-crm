
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      console.error('API Login: Database connection is not available');
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      console.warn('API Login: Email or password missing from request');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    console.log(`API Login: Attempting login for email: ${email}`);
    // Changed 'FROM Users' to 'FROM User'
    const stmtUser = db.prepare('SELECT id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM User WHERE email = ?');
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      console.warn(`API Login: User not found or no hashed password for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // TODO: CRITICAL SECURITY FLAW - Remove this direct comparison and use bcrypt.compare once passwords are properly hashed in DB.
    // const passwordMatch = (password === userData.hashedPassword);
    // For now, assuming passwords in DB are NOT yet bcrypt hashed IF you are using mock data passwords.
    // If you have ALREADY stored bcrypt hashed passwords, uncomment below and comment/remove above.
    const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);

    if (!passwordMatch) {
      console.warn(`API Login: Password mismatch for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

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

    cookies().set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds,
      expires: new Date(Date.now() + maxAgeSeconds * 1000),
    });
    console.log(`API Login: Session cookie set for user: ${userToSign.email}`);

    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    if (error instanceof Error && error.message.includes('data and salt arguments required') && error.message.includes('bcrypt')) {
      // This specific error message can occur if bcrypt.compare is called with an invalid hash (e.g. plain text password from your mock "hashed" passwords)
      console.error('API Login: bcrypt.compare failed. Ensure passwords in DB are correctly hashed or temporarily use direct string comparison if using placeholder hashes.');
      return NextResponse.json({ error: 'Authentication process error. Check server logs.' }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes('data and salt arguments required')) {
      return NextResponse.json({ error: 'Invalid input for password comparison.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during login.' }, { status: 500 });
  }
}
