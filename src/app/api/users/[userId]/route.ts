
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, UserRole } from '@/lib/types';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get admin details from JWT
async function getAdminFromRequest(request: NextRequest): Promise<{ id: string, organizationId: string, role: UserRole } | null> {
  if (!JWT_SECRET) {
    console.error('API User Detail: JWT_SECRET not configured.');
    return null;
  }
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    console.warn('API User Detail: No session token found for admin check.');
    return null;
  }
  try {
    const { payload } = await jose.jwtVerify(sessionToken, new TextEncoder().encode(JWT_SECRET));
    if (payload.role !== 'admin' || !payload.sub || !payload.organizationId) {
      console.warn('API User Detail: User is not an admin or token payload is invalid.');
      return null;
    }
    return { 
      id: payload.sub as string, 
      organizationId: payload.organizationId as string,
      role: payload.role as UserRole 
    };
  } catch (error) {
    console.error('API User Detail: Error verifying admin token:', error);
    return null;
  }
}

// PUT (update) an existing user (admin only)
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required to update users.' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { firstName, lastName, email, role, profilePictureUrl, isActive } = body;

    // Validate input
    if (!firstName || !lastName || !email || !role || isActive === undefined) {
      return NextResponse.json({ error: 'First name, last name, email, role, and active status are required' }, { status: 400 });
    }
    if (role !== 'admin' && role !== 'user') {
        return NextResponse.json({ error: 'Invalid role specified. Must be "admin" or "user".' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'Invalid isActive status. Must be true or false.' }, { status: 400 });
    }
    
    // Prevent admin from deactivating themselves or changing their own role if they are the only admin
    // This is a simplified check. A real system might need more robust logic.
    if (userId === admin.id) {
        if (isActive === false) {
            return NextResponse.json({ error: "Cannot deactivate your own admin account." }, { status: 403 });
        }
        if (role !== 'admin') {
             return NextResponse.json({ error: "Cannot change your own admin role." }, { status: 403 });
        }
    }


    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Users 
       SET firstName = ?, lastName = ?, email = ?, role = ?, profilePictureUrl = ?, isActive = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?` // Ensure admin can only update users in their own org
    );
    
    const result = stmt.run(
      firstName,
      lastName,
      email,
      role,
      profilePictureUrl || null,
      isActive ? 1 : 0,
      now,
      userId,
      admin.organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found, not in your organization, or no changes made' }, { status: 404 });
    }
    
    const stmtUpdatedUser = db.prepare('SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM Users WHERE id = ?');
    const updatedUserData = stmtUpdatedUser.get(userId) as User;

    return NextResponse.json(updatedUserData);

  } catch (error: any) {
    console.error(`API Error updating user ${params.userId}:`, error);
     if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('Users.email')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

// Note: DELETE endpoint for users is often avoided in favor of deactivation (setting isActive=false)
// If you need a hard delete, you can implement a DELETE handler here.
