
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';
import * as jose from 'jose';
import { cookies } from 'next/headers';

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
    const userData = stmtUser.get(email) as User & { hashedPassword?: string } | undefined; // Add hashedPassword to type for internal use

    if (!userData) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // TODO: CRITICAL SECURITY FLAW - Replace with bcrypt.compare()
    // This is a DIRECT string comparison for demonstration with mock "hashed" passwords.
    // In a real application, you MUST:
    // 1. Hash passwords with bcrypt (or Argon2) when users are created/seeded.
    // 2. Use `await bcrypt.compare(password, userData.hashedPassword)` here.
    // Example: const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);
    const passwordMatch = password === userData.hashedPassword;

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Exclude hashedPassword from the user object that might be returned or used in JWT
    const { hashedPassword, ...userToSign } = userData;

    // Create JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';
    const jwt = await new jose.SignJWT(userToSign)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(process.env.JWT_EXPIRATION_TIME || '1h') // Use env variable or default
      .sign(secret);

    // Set JWT in an HTTP-only cookie
    cookies().set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1, // 1 hour in seconds, should match JWT_EXPIRATION_TIME if possible
                           // Or manage maxAge separately if JWT has its own expiry claim
    });


    return NextResponse.json({ success: true, user: userToSign });

  } catch (error) {
    console.error('API Login Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
