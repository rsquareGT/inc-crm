
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, UserRole } from '@/lib/types';
import { generateId } from '@/lib/utils';
import bcrypt from 'bcrypt';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get admin details from JWT (could be moved to a shared util)
async function getAdminFromRequest(request: NextRequest): Promise<{ id: string, organizationId: string, role: UserRole } | null> {
  if (!JWT_SECRET) {
    console.error('API Users: JWT_SECRET not configured.');
    return null;
  }
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    console.warn('API Users: No session token found for admin check.');
    return null;
  }
  try {
    const { payload } = await jose.jwtVerify(sessionToken, new TextEncoder().encode(JWT_SECRET));
    if (payload.role !== 'admin' || !payload.sub || !payload.organizationId) {
      console.warn('API Users: User is not an admin or token payload is invalid.');
      return null;
    }
    return {
      id: payload.sub as string,
      organizationId: payload.organizationId as string,
      role: payload.role as UserRole
    };
  } catch (error) {
    console.error('API Users: Error verifying admin token:', error);
    return null;
  }
}


// GET all users (for admin's organization)
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtUsers = db.prepare(\`
      SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt
      FROM Users
      WHERE organizationId = ?
      ORDER BY lastName ASC, firstName ASC
    \`);
    const usersData = stmtUsers.all(admin.organizationId) as User[];

    return NextResponse.json(usersData);
  } catch (error) {
    console.error('API Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}

// POST a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required to create users.' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { email, password, firstName, lastName, role, profilePictureUrl } = body;

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Email, password, first name, last name, and role are required' }, { status: 400 });
    }
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Invalid role specified. Must be "admin" or "user".' }, { status: 400 });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      \`INSERT INTO Users (id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`
    );

    stmt.run(
      newUserId,
      admin.organizationId, // New user belongs to the admin's organization
      email,
      hashedPassword,
      firstName,
      lastName,
      profilePictureUrl || null,
      role,
      1, // isActive defaults to true
      now,
      now
    );

    const newUser: Omit<User, 'hashedPassword'> = {
      id: newUserId,
      organizationId: admin.organizationId,
      email,
      firstName,
      lastName,
      profilePictureUrl: profilePictureUrl || undefined,
      role: role as UserRole,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(newUser, { status: 201 });

  } catch (error: any) {
    console.error('API Error creating user:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('Users.email')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
