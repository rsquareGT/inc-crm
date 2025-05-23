
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured on the server.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated. No session token.' }, { status: 401 });
  }

  try {
    const { payload } = await jose.jwtVerify(
      sessionToken,
      new TextEncoder().encode(JWT_SECRET)
    );

    const userId = payload.sub; // 'sub' is standard for subject (user ID)

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid token payload.' }, { status: 401 });
    }

    // Fetch user from DB to ensure they still exist and get fresh data
    // Exclude hashedPassword from the returned user object
    const stmtUser = db.prepare(
      'SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, createdAt, updatedAt FROM Users WHERE id = ?'
    );
    const user = stmtUser.get(userId) as User | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('GET /api/auth/me - JWT Verification or DB Error:', error);
    if (error instanceof jose.errors.JWTExpired) {
        return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    if (error instanceof jose.errors.JOSEError) { // Covers other JWT errors like signature invalid
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }
}
