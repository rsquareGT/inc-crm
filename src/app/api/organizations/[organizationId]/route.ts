
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Organization } from '@/lib/types';

// GET an organization by ID
export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const { organizationId } = params;
    // TODO: Add authorization - ensure the requesting user belongs to this organization or is a superadmin
    
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
    const { organizationId } = params;
    // TODO: Add authorization - ensure the requesting user is an admin of this organization
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      'UPDATE Organizations SET name = ?, logoUrl = ?, updatedAt = ? WHERE id = ?'
    );
    
    const result = stmt.run(
      name,
      logoUrl || null,
      now,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Organization not found or no changes made' }, { status: 404 });
    }
    
    const stmtUpdatedOrg = db.prepare('SELECT * FROM Organizations WHERE id = ?');
    const updatedOrganization = stmtUpdatedOrg.get(organizationId) as Organization;

    return NextResponse.json(updatedOrganization);

  } catch (error) {
    console.error(`API Error updating organization ${params.organizationId}:`, error);
    return NextResponse.json({ error: 'Failed to update organization.' }, { status: 500 });
  }
}
