
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

    // TODO: CRITICAL SECURITY FLAW - Replace this with bcrypt.compare when real hashed passwords are in DB
    // const passwordMatch = password === userData.hashedPassword;
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
        // Add any other non-sensitive claims you need
      })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRATION_TIME || '1h') // Use env variable or default
      .sign(secret);

    // Set JWT in an HTTP-only cookie
    cookies().set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: parseInt(process.env.JWT_MAX_AGE_SECONDS || '3600', 10), // 1 hour in seconds by default
    });

    // Return the user object (without password) on successful login
    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    if (error instanceof Error && error.message.includes('data and salt arguments required')) {
      return NextResponse.json({ error: 'Invalid input for password comparison.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
