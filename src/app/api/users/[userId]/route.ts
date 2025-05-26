
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { User, UserRole } from '@/lib/types';
import { logActivity } from '@/services/activity-logger';

// PUT (update) an existing user
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  console.log(`API PUT /api/users/${params.userId} - Request received`);
  try {
    const { userId: targetUserId } = params; // ID of the user being updated
    
    const requestingUserId = request.headers.get('x-user-id');
    const requestingUserOrganizationId = request.headers.get('x-user-organization-id');
    const requestingUserRole = request.headers.get('x-user-role') as UserRole;

    if (!requestingUserId || !requestingUserOrganizationId || !requestingUserRole) {
      console.warn(`API PUT /api/users/${targetUserId}: Unauthorized: User session details missing.`);
      return NextResponse.json({ error: 'Unauthorized: User session details missing.' }, { status: 401 });
    }

    if (!db) {
      console.error(`API PUT /api/users/${targetUserId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    
    const body = await request.json();
    console.log(`API PUT /api/users/${targetUserId} - Request body:`, body);

    // Fetch current user data for logging changes and checks
    const stmtCurrentUser = db.prepare('SELECT * FROM Users WHERE id = ? AND organizationId = ?');
    const currentUserData = stmtCurrentUser.get(targetUserId, requestingUserOrganizationId) as User | undefined;

    if (!currentUserData) {
      console.warn(`API PUT /api/users/${targetUserId}: User not found in organization ${requestingUserOrganizationId}`);
      return NextResponse.json({ error: 'User not found or not authorized for this operation' }, { status: 404 });
    }

    let { firstName, lastName, email, role, profilePictureUrl, isActive } = body;
    const updates: Record<string, any> = {};
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];

    // User editing their own profile
    if (targetUserId === requestingUserId) {
      if (firstName !== undefined && currentUserData.firstName !== firstName) { updates.firstName = firstName; changes.push({ field: 'First Name', oldValue: currentUserData.firstName, newValue: firstName });}
      if (lastName !== undefined && currentUserData.lastName !== lastName) { updates.lastName = lastName; changes.push({ field: 'Last Name', oldValue: currentUserData.lastName, newValue: lastName });}
      if (email !== undefined && currentUserData.email !== email) {
        // Check if new email is already taken by another user in the same org
        const emailCheckStmt = db.prepare('SELECT id FROM Users WHERE email = ? AND organizationId = ? AND id != ?');
        const existingUserWithEmail = emailCheckStmt.get(email, requestingUserOrganizationId, targetUserId);
        if (existingUserWithEmail) {
          return NextResponse.json({ error: 'This email address is already in use by another user in your organization.' }, { status: 409 });
        }
        updates.email = email; changes.push({ field: 'Email', oldValue: currentUserData.email, newValue: email });
      }
      if (profilePictureUrl !== undefined && currentUserData.profilePictureUrl !== profilePictureUrl) { updates.profilePictureUrl = profilePictureUrl; changes.push({ field: 'Profile Picture URL', oldValue: currentUserData.profilePictureUrl, newValue: profilePictureUrl });}
      
      // Users cannot change their own role, isActive status, or orgId via this self-edit profile
      if (body.role !== undefined || body.isActive !== undefined || body.organizationId !== undefined) {
         console.warn(`API PUT /api/users/${targetUserId}: User trying to update restricted fields (role, isActive, organizationId) for self.`);
         // Silently ignore these attempts or return a 403, for now ignoring.
      }
    } 
    // Admin editing a user
    else if (requestingUserRole === 'admin') {
      if (firstName !== undefined && currentUserData.firstName !== firstName) { updates.firstName = firstName; changes.push({ field: 'First Name', oldValue: currentUserData.firstName, newValue: firstName });}
      if (lastName !== undefined && currentUserData.lastName !== lastName) { updates.lastName = lastName; changes.push({ field: 'Last Name', oldValue: currentUserData.lastName, newValue: lastName });}
      if (email !== undefined && currentUserData.email !== email) {
        const emailCheckStmt = db.prepare('SELECT id FROM Users WHERE email = ? AND organizationId = ? AND id != ?');
        const existingUserWithEmail = emailCheckStmt.get(email, requestingUserOrganizationId, targetUserId);
        if (existingUserWithEmail) {
          return NextResponse.json({ error: 'This email address is already in use by another user in your organization.' }, { status: 409 });
        }
        updates.email = email; changes.push({ field: 'Email', oldValue: currentUserData.email, newValue: email });
      }
      if (profilePictureUrl !== undefined && currentUserData.profilePictureUrl !== profilePictureUrl) { updates.profilePictureUrl = profilePictureUrl; changes.push({ field: 'Profile Picture URL', oldValue: currentUserData.profilePictureUrl, newValue: profilePictureUrl });}
      
      if (role !== undefined && currentUserData.role !== role) {
        if (role !== 'admin' && role !== 'user') return NextResponse.json({ error: 'Invalid role specified. Must be "admin" or "user".' }, { status: 400 });
        if (targetUserId === requestingUserId && role !== 'admin' && currentUserData.role === 'admin') { // Admin trying to demote self
            return NextResponse.json({ error: "Cannot change your own admin role." }, { status: 403 });
        }
        updates.role = role; changes.push({ field: 'Role', oldValue: currentUserData.role, newValue: role });
      }
      
      if (isActive !== undefined && typeof isActive === 'boolean' && currentUserData.isActive !== isActive) {
        if (targetUserId === requestingUserId && !isActive) { // Admin trying to deactivate self
            const activeAdminCountStmt = db.prepare('SELECT COUNT(*) as count FROM Users WHERE organizationId = ? AND role = \'admin\' AND isActive = 1');
            const adminCountResult = activeAdminCountStmt.get(requestingUserOrganizationId) as { count: number };
            if (adminCountResult.count <= 1) {
                 return NextResponse.json({ error: "Cannot deactivate the only active admin account in the organization." }, { status: 403 });
            }
        }
        updates.isActive = isActive ? 1 : 0; changes.push({ field: 'Status', oldValue: currentUserData.isActive ? 'Active' : 'Inactive', newValue: isActive ? 'Active' : 'Inactive' });
      }
    } 
    // Not admin and not self-editing
    else {
      console.warn(`API PUT /api/users/${targetUserId}: Unauthorized attempt to update user by ${requestingUserId}.`);
      return NextResponse.json({ error: 'Forbidden: You do not have permission to update this user.' }, { status: 403 });
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes to apply.', user: currentUserData }, { status: 200 });
    }

    updates.updatedAt = new Date().toISOString();
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), targetUserId, requestingUserOrganizationId];

    const stmtUpdate = db.prepare(
      `UPDATE Users SET ${setClauses} WHERE id = ? AND organizationId = ?`
    );
    const result = stmtUpdate.run(...values);

    if (result.changes === 0) {
      console.warn(`API PUT /api/users/${targetUserId}: Update failed or no rows affected for user in organization ${requestingUserOrganizationId}.`);
      return NextResponse.json({ error: 'User not found or no changes made during update' }, { status: 404 });
    }
    
    let activityType: 'updated_user' | 'activated_user' | 'deactivated_user' = 'updated_user';
    if (updates.isActive !== undefined) {
        activityType = updates.isActive === 1 ? 'activated_user' : 'deactivated_user';
    }

    if (changes.length > 0) {
      await logActivity({
        organizationId: requestingUserOrganizationId,
        userId: requestingUserId, 
        activityType: activityType,
        entityType: 'user',
        entityId: targetUserId,
        entityName: `${updates.firstName || currentUserData.firstName} ${updates.lastName || currentUserData.lastName}`,
        details: { changes }
      });
    }

    const stmtUpdatedUser = db.prepare('SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM Users WHERE id = ? AND organizationId = ?');
    const updatedUserData = stmtUpdatedUser.get(targetUserId, requestingUserOrganizationId) as User;

    console.log(`API PUT /api/users/${targetUserId}: User updated successfully by ${requestingUserId}.`);
    return NextResponse.json(updatedUserData);

  } catch (error: any) {
    console.error(`API PUT /api/users/${params.userId} - Error:`, error);
     if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('Users.email')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
