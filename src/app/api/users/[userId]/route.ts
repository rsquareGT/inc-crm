
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, UserRole } from '@/lib/types';
import * as jose from 'jose';
import { logActivity } from '@/services/activity-logger'; // Added

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get admin details from JWT
async function getAdminFromRequest(request: NextRequest): Promise<{ id: string, organizationId: string, role: UserRole } | null> {
  if (!JWT_SECRET) {
    console.error('API User Detail: JWT_SECRET not configured.');
    return null;
  }
  // Use headers injected by middleware instead of re-verifying JWT
  const adminId = request.headers.get('x-user-id');
  const adminOrganizationId = request.headers.get('x-user-organization-id');
  const adminRole = request.headers.get('x-user-role') as UserRole;

  if (!adminId || !adminOrganizationId || !adminRole) {
    console.warn('API User Detail: Admin session details not found in headers.');
    return null;
  }
  if (adminRole !== 'admin') {
    console.warn('API User Detail: Requesting user is not an admin.');
    return null;
  }
  return { id: adminId, organizationId: adminOrganizationId, role: adminRole };
}

// PUT (update) an existing user (admin only)
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId: targetUserId } = params; // ID of the user being updated
    const admin = await getAdminFromRequest(request); // Authenticated admin performing the action
    
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
    
    // Fetch current user data for logging changes and checks
    const stmtCurrentUser = db.prepare('SELECT * FROM Users WHERE id = ? AND organizationId = ?');
    const currentUserData = stmtCurrentUser.get(targetUserId, admin.organizationId) as User | undefined;

    if (!currentUserData) {
        return NextResponse.json({ error: 'User not found in your organization or not authorized for update' }, { status: 404 });
    }

    // Prevent admin from deactivating themselves or changing their own role if they are the only active admin
    if (targetUserId === admin.id) {
        if (isActive === false && currentUserData.isActive === true) { // Trying to deactivate self
            const activeAdminCountStmt = db.prepare('SELECT COUNT(*) as count FROM Users WHERE organizationId = ? AND role = \'admin\' AND isActive = 1');
            const adminCountResult = activeAdminCountStmt.get(admin.organizationId) as { count: number };
            if (adminCountResult.count <= 1) {
                 return NextResponse.json({ error: "Cannot deactivate the only active admin account in the organization." }, { status: 403 });
            }
        }
        if (role !== 'admin' && currentUserData.role === 'admin') { // Trying to demote self
             return NextResponse.json({ error: "Cannot change your own admin role." }, { status: 403 });
        }
    }


    const now = new Date().toISOString();

    // Note: Password changes should ideally be handled via a separate, dedicated flow.
    // If 'password' is included in the body here, it would be ignored by this simplified PUT.
    // For admin-initiated password resets, a specific mechanism would be needed.
    const stmt = db.prepare(
      `UPDATE Users
       SET firstName = ?, lastName = ?, email = ?, role = ?, profilePictureUrl = ?, isActive = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?` 
    );

    const result = stmt.run(
      firstName,
      lastName,
      email,
      role,
      profilePictureUrl || null,
      isActive ? 1 : 0,
      now,
      targetUserId,
      admin.organizationId 
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found, not in your organization, or no changes made' }, { status: 404 });
    }

    // Log activity with detailed changes
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    if (currentUserData.firstName !== firstName) changes.push({ field: 'First Name', oldValue: currentUserData.firstName, newValue: firstName });
    if (currentUserData.lastName !== lastName) changes.push({ field: 'Last Name', oldValue: currentUserData.lastName, newValue: lastName });
    if (currentUserData.email !== email) changes.push({ field: 'Email', oldValue: currentUserData.email, newValue: email });
    if (currentUserData.role !== role) changes.push({ field: 'Role', oldValue: currentUserData.role, newValue: role });
    if ((currentUserData.profilePictureUrl || null) !== (profilePictureUrl || null)) changes.push({ field: 'Profile Picture URL', oldValue: currentUserData.profilePictureUrl, newValue: profilePictureUrl || null });
    
    let activityType: 'updated_user' | 'activated_user' | 'deactivated_user' = 'updated_user';
    if (currentUserData.isActive !== isActive) {
        changes.push({ field: 'Status', oldValue: currentUserData.isActive ? 'Active' : 'Inactive', newValue: isActive ? 'Active' : 'Inactive' });
        activityType = isActive ? 'activated_user' : 'deactivated_user';
    }

    // Password changes are not handled here to avoid complexity and encourage a dedicated flow
    // If a password field were part of `body` and processed, it would be:
    // if (body.password) changes.push({ field: 'Password', oldValue: '[REDACTED]', newValue: '[REDACTED]' });


    if (changes.length > 0) {
      await logActivity({
        organizationId: admin.organizationId,
        userId: admin.id, // The admin performing the action
        activityType: activityType,
        entityType: 'user',
        entityId: targetUserId,
        entityName: `${firstName} ${lastName}`,
        details: { changes }
      });
    }

    const stmtUpdatedUser = db.prepare('SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM Users WHERE id = ?');
    const updatedUserData = stmtUpdatedUser.get(targetUserId) as User;

    return NextResponse.json(updatedUserData);

  } catch (error: any) {
    console.error(`API Error updating user ${params.userId}:`, error);
     if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('Users.email')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

    