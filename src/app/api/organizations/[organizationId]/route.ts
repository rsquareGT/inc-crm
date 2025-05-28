
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Organization } from '@/lib/types';
import { logActivity } from '@/services/activity-logger';

// GET an organization by ID
export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {

  try {
    const { organizationId } = await params;
    const requestingOrgId = request.headers.get('x-user-organization-id');
    console.log(`API GET /api/organizations/${organizationId} - Request received`);

    if (!requestingOrgId) {
        console.warn(`API GET /api/organizations/${organizationId}: Unauthorized: Organization ID missing from session.`);
        return NextResponse.json({ error: 'Unauthorized: Organization ID missing from session.' }, { status: 401 });
    }
    // Ensure the user can only fetch their own organization's details
    if (organizationId !== requestingOrgId) {
        console.warn(`API GET /api/organizations/${organizationId}: Forbidden: User from org ${requestingOrgId} trying to access org ${organizationId}.`);
        return NextResponse.json({ error: 'Forbidden: You can only view your own organization.' }, { status: 403 });
    }

    if (!db) {
      console.error(`API GET /api/organizations/${organizationId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtOrganization = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const organization = stmtOrganization.get(organizationId) as Organization | undefined;

    if (!organization) {
      console.warn(`API GET /api/organizations/${organizationId}: Organization not found.`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    console.log(`API GET /api/organizations/${organizationId}: Organization found and returned.`);
    return NextResponse.json(organization);
  } catch (error) {
    console.error(`API GET /api/organizations/${params.organizationId} - Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch organization.' }, { status: 500 });
  }
}

// PUT (update) an existing organization
export async function PUT(request: NextRequest, { params }: { params: { organizationId: string } }) {
  console.log(`API PUT /api/organizations/${params.organizationId} - Request received`);
  try {
    const { organizationId: targetOrgId } = await params;
    const requestingUserId = request.headers.get('x-user-id');
    const requestingOrgId = request.headers.get('x-user-organization-id');
    const userRole = request.headers.get('x-user-role');

    if (!requestingUserId || !requestingOrgId || !userRole) {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Unauthorized: User session details missing.`);
      return NextResponse.json({ error: 'Unauthorized: User session details missing.' }, { status: 401 });
    }

    if (userRole !== 'admin') {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Forbidden: User ${requestingUserId} (role: ${userRole}) is not an admin.`);
      return NextResponse.json({ error: 'Forbidden: Only admins can update organization details.' }, { status: 403 });
    }

    if (targetOrgId !== requestingOrgId) {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Forbidden: Admin ${requestingUserId} from org ${requestingOrgId} trying to update different org ${targetOrgId}.`);
      return NextResponse.json({ error: 'Forbidden: Admins can only update their own organization.' }, { status: 403 });
    }

    if (!db) {
      console.error(`API PUT /api/organizations/${targetOrgId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    console.log(`API PUT /api/organizations/${targetOrgId} - Request body:`, body);
    const { name, logoUrl, street, city, state, postalCode, country, currencySymbol, timezone } = body;

    if (!name) {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Organization name is required.`);
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // Fetch current organization data for logging changes
    const stmtCurrentOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const currentOrgData = stmtCurrentOrg.get(targetOrgId) as Organization | undefined;

    if (!currentOrgData) {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Organization not found for update.`);
      return NextResponse.json({ error: 'Organization not found for update' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updatedAt: now };
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];

    if (name !== undefined && currentOrgData.name !== name) { updates.name = name; changes.push({ field: 'Name', oldValue: currentOrgData.name, newValue: name });}
    if (logoUrl !== undefined && currentOrgData.logoUrl !== logoUrl) { updates.logoUrl = logoUrl || null; changes.push({ field: 'Logo URL', oldValue: currentOrgData.logoUrl, newValue: logoUrl || null });}
    if (street !== undefined && currentOrgData.street !== street) { updates.street = street || null; changes.push({ field: 'Street', oldValue: currentOrgData.street, newValue: street || null });}
    if (city !== undefined && currentOrgData.city !== city) { updates.city = city || null; changes.push({ field: 'City', oldValue: currentOrgData.city, newValue: city || null });}
    if (state !== undefined && currentOrgData.state !== state) { updates.state = state || null; changes.push({ field: 'State', oldValue: currentOrgData.state, newValue: state || null });}
    if (postalCode !== undefined && currentOrgData.postalCode !== postalCode) { updates.postalCode = postalCode || null; changes.push({ field: 'Postal Code', oldValue: currentOrgData.postalCode, newValue: postalCode || null });}
    if (country !== undefined && currentOrgData.country !== country) { updates.country = country || null; changes.push({ field: 'Country', oldValue: currentOrgData.country, newValue: country || null });}
    if (currencySymbol !== undefined && currentOrgData.currencySymbol !== currencySymbol) { updates.currencySymbol = currencySymbol || null; changes.push({ field: 'Currency Symbol', oldValue: currentOrgData.currencySymbol, newValue: currencySymbol || null });}
    if (timezone !== undefined && currentOrgData.timezone !== timezone) { updates.timezone = timezone || null; changes.push({ field: 'Timezone', oldValue: currentOrgData.timezone, newValue: timezone || null });}


    if (Object.keys(updates).length <= 1) { // Only updatedAt
        console.log(`API PUT /api/organizations/${targetOrgId}: No actual changes detected.`);
        const stmtUnchangedOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?'); // Fetch again to ensure fresh data
        const unchangedOrganization = stmtUnchangedOrg.get(targetOrgId) as Organization;
        return NextResponse.json(unchangedOrganization); // Return current data if no changes
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), targetOrgId];

    const stmtUpdate = db.prepare(
      `UPDATE Organizations SET ${setClauses} WHERE id = ?`
    );

    const result = stmtUpdate.run(...values);

    if (result.changes === 0) {
      console.warn(`API PUT /api/organizations/${targetOrgId}: Update failed, no rows affected.`);
      // This might happen if ID is wrong, but currentOrgData check should prevent it.
      return NextResponse.json({ error: 'Organization not found or no changes made during update' }, { status: 404 });
    }

    if (changes.length > 0) {
      await logActivity({
        organizationId: requestingOrgId,
        userId: requestingUserId,
        activityType: 'updated_organization',
        entityType: 'organization',
        entityId: targetOrgId,
        entityName: updates.name || currentOrgData.name,
        details: { changes }
      });
    }

    const stmtUpdatedOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const updatedOrganization = stmtUpdatedOrg.get(targetOrgId) as Organization;
    console.log(`API PUT /api/organizations/${targetOrgId}: Organization updated successfully.`);
    return NextResponse.json(updatedOrganization);

  } catch (error: any) {
    console.error(`API PUT /api/organizations/${params.organizationId} - Error:`, error);
    if (error.code && error.message && error.code.startsWith('SQLITE_')) {
      return NextResponse.json({ error: `Database error: ${error.message} (Code: ${error.code})` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to update organization.' }, { status: 500 });
  }
}
