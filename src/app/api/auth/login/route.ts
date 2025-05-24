
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const stmtUser = db.prepare('SELECT id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM Users WHERE email = ?');
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Exclude hashedPassword from the user object that will be part of JWT or returned
    const { hashedPassword, ...userToSign } = userData;

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Server configuration error for authentication.' }, { status: 500 });
    }

    // Create JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';
    const jwt = await new jose.SignJWT({
        sub: userToSign.id, // Subject (user ID)
        email: userToSign.email,
        role: userToSign.role,
        organizationId: userToSign.organizationId,
      })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRATION_TIME || '1h') 
      .sign(secret);

    const maxAgeSeconds = parseInt(process.env.JWT_MAX_AGE_SECONDS || '3600', 10);

    // Set JWT in an HTTP-only cookie
    cookies().set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds, 
      expires: new Date(Date.now() + maxAgeSeconds * 1000), // Explicit expires also good
    });

    // Return the user object (without password) on successful login
    // This allows AuthContext to immediately have the user info if needed,
    // though fetchUser after this is the main source of truth for context.
    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    if (error instanceof Error && error.message.includes('data and salt arguments required')) {
      return NextResponse.json({ error: 'Invalid input for password comparison.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
