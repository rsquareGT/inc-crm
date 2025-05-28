
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Company } from '@/lib/types';
import { logActivity } from '@/services/activity-logger';

// GET a single company by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = await params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtCompany = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
              FROM Notes n WHERE n.companyId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Companies c
      WHERE c.id = ? AND c.organizationId = ?
    `);
    const companyData = stmtCompany.get(companyId, organizationId) as any;

    if (!companyData) {
      return NextResponse.json({ error: 'Company not found or not authorized' }, { status: 404 });
    }

    const company: Company = {
      ...companyData,
      tags: companyData.tags ? JSON.parse(companyData.tags) : [],
      notes: companyData.notes_json ? JSON.parse(companyData.notes_json) : [],
    };

    return NextResponse.json(company);
  } catch (error) {
    console.error(`API Error fetching company ${params.companyId}:`, error);
    let errorMessage = 'Failed to fetch company.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT (update) an existing company, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { companyId: string } }) {
  console.log(`API PUT /api/companies/${params.companyId} - Request received`);
  try {
    const { companyId } = await params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      console.error(`API PUT /api/companies/${companyId}: Unauthorized: Organization or User ID missing.`);
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      console.error(`API PUT /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    console.log(`API PUT /api/companies/${companyId} - Request body:`, JSON.stringify(body, null, 2));

    const { name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description } = body;

    if (!name) {
      console.warn(`API PUT /api/companies/${companyId}: Company name is required`);
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Fetch current company data for logging changes
    const stmtCurrentCompany = db.prepare('SELECT * FROM Companies WHERE id = ? AND organizationId = ?');
    const currentCompanyData = stmtCurrentCompany.get(companyId, organizationId) as Company | undefined;

    if (!currentCompanyData) {
        return NextResponse.json({ error: 'Company not found or not authorized for update' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(
      `UPDATE Companies
       SET name = ?, industry = ?, website = ?, street = ?, city = ?, state = ?, postalCode = ?, country = ?,
           contactPhone1 = ?, contactPhone2 = ?, companySize = ?, accountManagerId = ?, tags = ?, description = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?`
    );

    const queryParams = [
        name,
        industry === '_none_' ? null : industry || null,
        website || null,
        street || null,
        city || null,
        state || null,
        postalCode || null,
        country || null,
        contactPhone1 || null,
        contactPhone2 || null,
        companySize === '_none_' ? null : companySize || null,
        accountManagerId === '_none_' ? null : accountManagerId || null,
        JSON.stringify(tags || []),
        description || null,
        now,
        companyId,
        organizationId
    ];

    const result = stmt.run(...queryParams);

    if (result.changes === 0) {
      console.warn(`API PUT /api/companies/${companyId}: Company not found, not authorized, or no changes made`);
      return NextResponse.json({ error: 'Company not found, not authorized, or no changes made' }, { status: 404 });
    }

    // Log activity with detailed changes
    const changes: Array<{field: string, oldValue: any, newValue: any}> = [];
    if (currentCompanyData.name !== name) changes.push({ field: 'Name', oldValue: currentCompanyData.name, newValue: name});
    if ((currentCompanyData.industry || null) !== (industry === '_none_' ? null : industry || null)) changes.push({ field: 'Industry', oldValue: currentCompanyData.industry, newValue: (industry === '_none_' ? null : industry || null) });
    if ((currentCompanyData.website || null) !== (website || null)) changes.push({ field: 'Website', oldValue: currentCompanyData.website, newValue: website || null });
    if ((currentCompanyData.street || null) !== (street || null)) changes.push({ field: 'Street', oldValue: currentCompanyData.street, newValue: street || null });
    if ((currentCompanyData.city || null) !== (city || null)) changes.push({ field: 'City', oldValue: currentCompanyData.city, newValue: city || null });
    if ((currentCompanyData.state || null) !== (state || null)) changes.push({ field: 'State', oldValue: currentCompanyData.state, newValue: state || null });
    if ((currentCompanyData.postalCode || null) !== (postalCode || null)) changes.push({ field: 'Postal Code', oldValue: currentCompanyData.postalCode, newValue: postalCode || null });
    if ((currentCompanyData.country || null) !== (country || null)) changes.push({ field: 'Country', oldValue: currentCompanyData.country, newValue: country || null });
    if ((currentCompanyData.contactPhone1 || null) !== (contactPhone1 || null)) changes.push({ field: 'Contact Phone 1', oldValue: currentCompanyData.contactPhone1, newValue: contactPhone1 || null });
    if ((currentCompanyData.contactPhone2 || null) !== (contactPhone2 || null)) changes.push({ field: 'Contact Phone 2', oldValue: currentCompanyData.contactPhone2, newValue: contactPhone2 || null });
    if ((currentCompanyData.companySize || null) !== (companySize === '_none_' ? null : companySize || null)) changes.push({ field: 'Company Size', oldValue: currentCompanyData.companySize, newValue: (companySize === '_none_' ? null : companySize || null) });
    if ((currentCompanyData.accountManagerId || null) !== (accountManagerId === '_none_' ? null : accountManagerId || null)) changes.push({ field: 'Account Manager ID', oldValue: currentCompanyData.accountManagerId, newValue: (accountManagerId === '_none_' ? null : accountManagerId || null) });
    if ((currentCompanyData.description || null) !== (description || null)) changes.push({ field: 'Description', oldValue: currentCompanyData.description, newValue: description || null });
    if (JSON.stringify(currentCompanyData.tags || []) !== JSON.stringify(tags || [])) changes.push({ field: 'Tags', oldValue: currentCompanyData.tags, newValue: tags || [] });


    if (changes.length > 0) {
      await logActivity({
        organizationId,
        userId,
        activityType: 'updated_company',
        entityType: 'company',
        entityId: companyId,
        entityName: name, // Log with the new name
        details: { changes }
      });
    }


    const stmtUpdatedCompany = db.prepare(`
        SELECT c.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
                FROM Notes n WHERE n.companyId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
        FROM Companies c
        WHERE c.id = ? AND c.organizationId = ?
    `);
    const updatedCompanyData = stmtUpdatedCompany.get(companyId, organizationId) as any;
     const updatedCompany: Company = {
      ...updatedCompanyData,
      tags: updatedCompanyData.tags ? JSON.parse(updatedCompanyData.tags) : [],
      notes: updatedCompanyData.notes_json ? JSON.parse(updatedCompanyData.notes_json) : [],
    };

    console.log(`API PUT /api/companies/${companyId} - Company updated successfully`);
    return NextResponse.json(updatedCompany);

  } catch (error: any) {
    console.error(`API Error updating company ${params.companyId}:`, error);
    let errorMessage = 'Failed to update company.';
    let statusCode = 500;

    if (error.code && error.message) {
      errorMessage = `Database error: ${error.message} (Code: ${error.code})`;
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        errorMessage = 'Failed to update company due to a data conflict (e.g., invalid Account Manager ID).';
        statusCode = 409;
      } else if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
        errorMessage = 'Failed to update company. A required field was missing or invalid.';
        statusCode = 400;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error(`API PUT /api/companies/${params.companyId} - Responding with error:`, errorMessage, `Status: ${statusCode}`);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// DELETE a company, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string } }) {
  console.log(`API DELETE /api/companies/${params.companyId} - Request received`);
  try {
    const { companyId } = await params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      console.error(`API DELETE /api/companies/${companyId}: Unauthorized: Organization or User ID missing.`);
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      console.error(`API DELETE /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Fetch company name for logging before deletion
    const companyCheckStmt = db.prepare('SELECT name FROM Companies WHERE id = ? AND organizationId = ?');
    const companyToDeleteData = companyCheckStmt.get(companyId, organizationId) as { name: string } | undefined;

    if (!companyToDeleteData) {
      return NextResponse.json({ error: 'Company not found or not authorized' }, { status: 404 });
    }
    const companyName = companyToDeleteData.name;

    db.transaction(() => {
      const stmtUpdateContacts = db.prepare('UPDATE Contacts SET companyId = NULL WHERE companyId = ? AND organizationId = ?');
      stmtUpdateContacts.run(companyId, organizationId);

      const stmtUpdateDeals = db.prepare('UPDATE Deals SET companyId = NULL WHERE companyId = ? AND organizationId = ?');
      stmtUpdateDeals.run(companyId, organizationId);

      const stmtDeleteCompany = db.prepare('DELETE FROM Companies WHERE id = ? AND organizationId = ?');
      const result = stmtDeleteCompany.run(companyId, organizationId);

      if (result.changes === 0) {
        // Should have been caught by companyCheckStmt, but as a fallback
        const notFoundError = new Error('Company not found or not authorized during transaction');
        (notFoundError as any).statusCode = 404; // Custom property for specific handling
        throw notFoundError;
      }
    })();

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_company',
      entityType: 'company',
      entityId: companyId,
      entityName: companyName, // Log with the name fetched before deletion
    });

    console.log(`API DELETE /api/companies/${companyId} - Company deleted successfully`);
    return NextResponse.json({ message: 'Company deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error deleting company ${params.companyId}:`, error);
    if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Company not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete company.' }, { status: 500 });
  }
}
