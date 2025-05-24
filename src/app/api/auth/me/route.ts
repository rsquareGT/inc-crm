
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  console.log('API /me: GET request received');
  if (!JWT_SECRET) {
    console.error('API /me: JWT_SECRET is not configured on the server.');
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    console.log('API /me: No session token found in cookies.');
    return NextResponse.json({ error: 'Not authenticated. No session token.' }, { status: 401 });
  }
  console.log('API /me: Session token found.');

  try {
    const { payload } = await jose.jwtVerify(
      sessionToken,
      new TextEncoder().encode(JWT_SECRET)
    );
    console.log('API /me: JWT verified successfully. Payload sub:', payload.sub);

    const userId = payload.sub;

    if (!userId || typeof userId !== 'string') {
      console.warn('API /me: Invalid token payload - missing or invalid userId.');
      return NextResponse.json({ error: 'Invalid token payload.' }, { status: 401 });
    }

    // Changed 'FROM Users' to 'FROM User'
    const stmtUser = db.prepare(
      'SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM User WHERE id = ?'
    );
    const user = stmtUser.get(userId) as User | undefined;

    if (!user) {
      console.warn(`API /me: User not found in DB for ID: ${userId}`);
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }
    console.log(`API /me: User ${user.email} fetched successfully from DB.`);
    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error('API /me: JWT Verification or DB Error:', error);
    if (error instanceof jose.errors.JWTExpired) {
        console.warn('API /me: JWT Expired.');
        return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    if (error instanceof jose.errors.JOSEError) {
        console.warn('API /me: JWT Invalid (e.g., signature mismatch).');
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Authentication failed due to server error during token processing.' }, { status: 500 });
  }
}
