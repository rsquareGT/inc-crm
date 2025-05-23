
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';

// In a real application, use a strong password hashing library like bcrypt
// const bcrypt = require('bcrypt'); 

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
    const userData = stmtUser.get(email) as User | undefined;

    if (!userData) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // IMPORTANT: This is a DIRECT string comparison for demonstration with mock "hashed" passwords.
    // In a real application, you MUST use bcrypt.compare() or similar.
    // Example: const passwordMatch = await bcrypt.compare(password, userData.hashedPassword);
    const passwordMatch = password === userData.hashedPassword;

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Exclude hashedPassword from the response
    const { hashedPassword, ...userWithoutPassword } = userData;

    return NextResponse.json({ success: true, user: userWithoutPassword });

  } catch (error) {
    console.error('API Login Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
