
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  console.log("API Login: POST request received");
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
    const stmtUser = db.prepare('SELECT id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM User WHERE email = ?');
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      console.warn(`API Login: User not found or no hashed password for email: ${email}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);

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

    const cookieStore = cookies(); // Get the cookie store instance
    cookieStore.set('session', jwt, { // Call set on the store instance
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
      console.error('API Login: bcrypt.compare failed. Ensure passwords in DB are correctly hashed or temporarily use direct string comparison if using placeholder hashes.');
      return NextResponse.json({ error: 'Authentication process error. Check server logs.' }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes('data and salt arguments required')) {
      return NextResponse.json({ error: 'Invalid input for password comparison.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during login.' }, { status: 500 });
  }
}
