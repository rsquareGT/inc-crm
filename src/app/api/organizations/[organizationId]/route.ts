
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Organization } from '@/lib/types';
import { logActivity } from '@/services/activity-logger';

// GET an organization by ID
export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const { organizationId } = params;
    const requestingOrgId = request.headers.get('x-user-organization-id');
    
    if (!requestingOrgId) {
        return NextResponse.json({ error: 'Unauthorized: Organization ID missing from session.' }, { status: 401 });
    }
    // Ensure the user can only fetch their own organization's details
    if (organizationId !== requestingOrgId) {
        return NextResponse.json({ error: 'Forbidden: You can only view your own organization.' }, { status: 403 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtOrganization = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const organization = stmtOrganization.get(organizationId) as Organization | undefined;

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error(`API Error fetching organization ${params.organizationId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch organization.' }, { status: 500 });
  }
}

// PUT (update) an existing organization
export async function PUT(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const { organizationId: targetOrgId } = params; // The org ID from the URL parameter
    const requestingUserId = request.headers.get('x-user-id');
    const requestingOrgId = request.headers.get('x-user-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!requestingUserId || !requestingOrgId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized: User session details missing.' }, { status: 401 });
    }

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can update organization details.' }, { status: 403 });
    }
    
    // Ensure admin can only update their own organization
    if (targetOrgId !== requestingOrgId) {
      return NextResponse.json({ error: 'Forbidden: Admins can only update their own organization.' }, { status: 403 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // Fetch current organization data for logging changes
    const stmtCurrentOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const currentOrgData = stmtCurrentOrg.get(targetOrgId) as Organization | undefined;

    if (!currentOrgData) {
      return NextResponse.json({ error: 'Organization not found for update' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      'UPDATE Organizations SET name = ?, logoUrl = ?, updatedAt = ? WHERE id = ?'
    );
    
    const result = stmt.run(
      name,
      logoUrl || null,
      now,
      targetOrgId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Organization not found or no changes made' }, { status: 404 });
    }
    
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    if (currentOrgData.name !== name) changes.push({ field: 'Name', oldValue: currentOrgData.name, newValue: name });
    if ((currentOrgData.logoUrl || null) !== (logoUrl || null)) changes.push({ field: 'Logo URL', oldValue: currentOrgData.logoUrl, newValue: logoUrl || null });

    if (changes.length > 0) {
      await logActivity({
        organizationId: requestingOrgId, // The org performing the action
        userId: requestingUserId,
        activityType: 'updated_organization',
        entityType: 'organization',
        entityId: targetOrgId,
        entityName: name, // Use new name
        details: { changes }
      });
    }

    const stmtUpdatedOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const updatedOrganization = stmtUpdatedOrg.get(targetOrgId) as Organization;

    return NextResponse.json(updatedOrganization);

  } catch (error) {
    console.error(`API Error updating organization ${params.organizationId}:`, error);
    return NextResponse.json({ error: 'Failed to update organization.' }, { status: 500 });
  }
}

    