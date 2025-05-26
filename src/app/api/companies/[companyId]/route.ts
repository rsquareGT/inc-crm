
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Company } from '@/lib/types';

// GET a single company by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
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
    const { companyId } = params;
    const organizationIdFromSession = request.headers.get('x-user-organization-id');
    if (!organizationIdFromSession) {
      console.error(`API PUT /api/companies/${companyId}: Unauthorized: Organization ID missing.`);
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      console.error(`API PUT /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    console.log(`API PUT /api/companies/${companyId} - Request body:`, JSON.stringify(body, null, 2));

    // The organizationId in the body is ignored; we use the one from the session for security.
    const { name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description } = body;

    if (!name) {
      console.warn(`API PUT /api/companies/${companyId}: Company name is required`);
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Companies
       SET name = ?, industry = ?, website = ?, street = ?, city = ?, state = ?, postalCode = ?, country = ?,
           contactPhone1 = ?, contactPhone2 = ?, companySize = ?, accountManagerId = ?, tags = ?, description = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?` // Ensure update is scoped to organization
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
        organizationIdFromSession
    ];

    console.log(`API PUT /api/companies/${companyId} - Executing update with params:`, queryParams);
    const result = stmt.run(...queryParams);
    console.log(`API PUT /api/companies/${companyId} - Update result:`, result);

    if (result.changes === 0) {
      console.warn(`API PUT /api/companies/${companyId}: Company not found, not authorized, or no changes made`);
      return NextResponse.json({ error: 'Company not found, not authorized, or no changes made' }, { status: 404 });
    }

    const stmtUpdatedCompany = db.prepare(`
        SELECT c.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
                FROM Notes n WHERE n.companyId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
        FROM Companies c
        WHERE c.id = ? AND c.organizationId = ?
    `);
    const updatedCompanyData = stmtUpdatedCompany.get(companyId, organizationIdFromSession) as any;
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
    const { companyId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      console.error(`API DELETE /api/companies/${companyId}: Unauthorized: Organization ID missing.`);
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      console.error(`API DELETE /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    db.transaction(() => {
      // Update related Contacts (companyId SET NULL)
      const stmtUpdateContacts = db.prepare('UPDATE Contacts SET companyId = NULL WHERE companyId = ? AND organizationId = ?');
      stmtUpdateContacts.run(companyId, organizationId);

      // Update related Deals (companyId SET NULL)
      const stmtUpdateDeals = db.prepare('UPDATE Deals SET companyId = NULL WHERE companyId = ? AND organizationId = ?');
      stmtUpdateDeals.run(companyId, organizationId);
      
      // Notes are deleted by CASCADE constraint in DB, but ensure company belongs to org
      // First check if company exists and belongs to the org
      const companyCheckStmt = db.prepare('SELECT id FROM Companies WHERE id = ? AND organizationId = ?');
      const companyExists = companyCheckStmt.get(companyId, organizationId);

      if (!companyExists) {
        const notFoundError = new Error('Company not found or not authorized');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }

      const stmtDeleteCompany = db.prepare('DELETE FROM Companies WHERE id = ? AND organizationId = ?');
      const result = stmtDeleteCompany.run(companyId, organizationId);

      if (result.changes === 0) {
        // This case should be caught by the companyExists check above, but as a fallback:
        const notFoundError = new Error('Company not found or not authorized');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }
    })();


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
