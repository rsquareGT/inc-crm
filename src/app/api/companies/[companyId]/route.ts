
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Company, Note, Contact, Deal } from '@/lib/types'; // Assuming Contact and Deal types are needed for future expansion

// GET a single company by ID
export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtCompany = db.prepare(`
      SELECT c.*, 
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
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
    
    // In the future, you might fetch related contacts and deals here
    // For now, they are handled on the client-side with mock data or separate fetches

    return NextResponse.json(company);
  } catch (error) {
    console.error(`API Error fetching company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch company.' }, { status: 500 });
  }
}

// PUT (update) an existing company
export async function PUT(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Companies 
       SET name = ?, industry = ?, website = ?, street = ?, city = ?, state = ?, postalCode = ?, country = ?, 
           contactPhone1 = ?, contactPhone2 = ?, companySize = ?, accountManagerId = ?, tags = ?, description = ?, updatedAt = ?
       WHERE id = ?`
    );
    
    const result = stmt.run(
      name,
      industry || null,
      website || null,
      street || null,
      city || null,
      state || null,
      postalCode || null,
      country || null,
      contactPhone1 || null,
      contactPhone2 || null,
      companySize || null,
      accountManagerId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      companyId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Company not found or no changes made' }, { status: 404 });
    }
    
    // Fetch the updated company to return it, including any notes (which are not modified here)
    const stmtUpdatedCompany = db.prepare(`
        SELECT c.*, 
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
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


    return NextResponse.json(updatedCompany);

  } catch (error) {
    console.error(`API Error updating company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to update company.' }, { status: 500 });
  }
}

// DELETE a company
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Related notes are set to ON DELETE CASCADE in schema, so they'll be auto-deleted.
    // Need to consider related Contacts (companyId SET NULL) and Deals (companyId SET NULL).
    
    // First, set companyId to NULL for related contacts
    const stmtUpdateContacts = db.prepare('UPDATE Contacts SET companyId = NULL WHERE companyId = ?');
    stmtUpdateContacts.run(companyId);

    // Then, set companyId to NULL for related deals
    const stmtUpdateDeals = db.prepare('UPDATE Deals SET companyId = NULL WHERE companyId = ?');
    stmtUpdateDeals.run(companyId);
    
    // Finally, delete the company
    const stmtDeleteCompany = db.prepare('DELETE FROM Companies WHERE id = ?');
    const result = stmtDeleteCompany.run(companyId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Company deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to delete company.' }, { status: 500 });
  }
}
