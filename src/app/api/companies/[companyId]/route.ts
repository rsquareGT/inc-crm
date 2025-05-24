
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Company, Note } from '@/lib/types'; // Assuming Contact and Deal types are needed for future expansion

// GET a single company by ID
export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // TODO: Add organizationId check based on authenticated user

    const stmtCompany = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
              FROM Notes n WHERE n.companyId = c.id ORDER BY n.createdAt DESC) as notes_json
      FROM Companies c
      WHERE c.id = ?
    `);
    const companyData = stmtCompany.get(companyId) as any;

    if (!companyData) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
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

// PUT (update) an existing company
export async function PUT(request: NextRequest, { params }: { params: { companyId: string } }) {
  console.log(`API PUT /api/companies/${params.companyId} - Request received`);
  try {
    const { companyId } = params;
    if (!db) {
      console.error(`API PUT /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    console.log(`API PUT /api/companies/${companyId} - Request body:`, JSON.stringify(body, null, 2));

    const { name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description, organizationId } = body;

    // TODO: Validate organizationId against authenticated user's organization

    if (!name) {
      console.warn(`API PUT /api/companies/${companyId}: Company name is required`);
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Companies
       SET name = ?, industry = ?, website = ?, street = ?, city = ?, state = ?, postalCode = ?, country = ?,
           contactPhone1 = ?, contactPhone2 = ?, companySize = ?, accountManagerId = ?, tags = ?, description = ?, updatedAt = ?
           ${organizationId !== undefined ? ', organizationId = ?' : ''}
       WHERE id = ?`
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
    ];

    if (organizationId !== undefined) {
        queryParams.push(organizationId);
    }
    queryParams.push(companyId);

    console.log(`API PUT /api/companies/${companyId} - Executing update with params:`, queryParams);
    const result = stmt.run(...queryParams);
    console.log(`API PUT /api/companies/${companyId} - Update result:`, result);


    if (result.changes === 0) {
      console.warn(`API PUT /api/companies/${companyId}: Company not found or no changes made`);
      return NextResponse.json({ error: 'Company not found or no changes made' }, { status: 404 });
    }

    const stmtUpdatedCompany = db.prepare(`
        SELECT c.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
                FROM Notes n WHERE n.companyId = c.id ORDER BY n.createdAt DESC) as notes_json
        FROM Companies c
        WHERE c.id = ?
    `);
    const updatedCompanyData = stmtUpdatedCompany.get(companyId) as any;
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

    if (error.code && error.message) { // Check if it's likely a SQLiteError
      errorMessage = `Database error: ${error.message} (Code: ${error.code})`;
      if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        errorMessage = 'Failed to update company due to a data conflict (e.g., invalid Account Manager ID).';
        statusCode = 409; // Conflict
      } else if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
        errorMessage = 'Failed to update company. A required field was missing or invalid.';
        statusCode = 400; // Bad Request
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error(`API PUT /api/companies/${params.companyId} - Responding with error:`, errorMessage, `Status: ${statusCode}`);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// DELETE a company
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string } }) {
  console.log(`API DELETE /api/companies/${params.companyId} - Request received`);
  try {
    const { companyId } = params;
    if (!db) {
      console.error(`API DELETE /api/companies/${companyId}: Database connection is not available`);
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // TODO: Add organizationId check based on authenticated user

    // Related notes are set to ON DELETE CASCADE in schema, so they'll be auto-deleted.
    // Need to consider related Contacts (companyId SET NULL) and Deals (companyId SET NULL).

    db.transaction(() => {
      console.log(`API DELETE /api/companies/${companyId} - Updating related Contacts`);
      const stmtUpdateContacts = db.prepare('UPDATE Contacts SET companyId = NULL WHERE companyId = ?');
      stmtUpdateContacts.run(companyId);

      console.log(`API DELETE /api/companies/${companyId} - Updating related Deals`);
      const stmtUpdateDeals = db.prepare('UPDATE Deals SET companyId = NULL WHERE companyId = ?');
      stmtUpdateDeals.run(companyId);

      console.log(`API DELETE /api/companies/${companyId} - Deleting company`);
      const stmtDeleteCompany = db.prepare('DELETE FROM Companies WHERE id = ?');
      const result = stmtDeleteCompany.run(companyId);

      if (result.changes === 0) {
        console.warn(`API DELETE /api/companies/${companyId}: Company not found`);
        // To ensure a 404 is returned, we need to throw an error that can be caught
        // or handle the response directly here if not in a transaction.
        // For simplicity here, we'll let the transaction complete and rely on client to infer from subsequent GET.
        // A more robust way would be to check changes and throw if 0 before transaction commit.
        // However, for this simple setup, if it was not found, other operations might not fail,
        // but the intent to delete something not found is still a client error.
        // We will return 404 from outside the transaction if needed.
        // For now, we rely on the structure that if this is the only operation that can fail for "not found",
        // it's okay. But this is a point of refinement.

        // Let's throw an error to be caught by the outer catch block to ensure a 404 if not found.
        const notFoundError = new Error('Company not found');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }
    })();


    console.log(`API DELETE /api/companies/${companyId} - Company deleted successfully`);
    return NextResponse.json({ message: 'Company deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error deleting company ${params.companyId}:`, error);
    if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete company.' }, { status: 500 });
  }
}
