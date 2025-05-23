
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Contact, Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // For generating IDs

// GET all contacts or contacts by companyId
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    // TODO: Add organizationId filtering based on authenticated user

    // Removed notes_json subquery temporarily for stability.
    // We will add it back or fetch notes separately.
    let query = `
      SELECT c.*
      FROM Contacts c
    `;
    const queryParams: any[] = [];

    if (companyId) {
      query += (queryParams.length === 0 ? ' WHERE' : ' AND') + ' c.companyId = ?';
      queryParams.push(companyId);
    }
    // TODO: Add organizationId to WHERE clause
    // if (organizationId) {
    //   query += (queryParams.length === 0 ? ' WHERE' : ' AND') + ' c.organizationId = ?';
    //   queryParams.push(organizationId);
    // }
    
    query += ' ORDER BY c.lastName ASC, c.firstName ASC';

    const stmtContacts = db.prepare(query);
    const contactsData = stmtContacts.all(...queryParams) as any[];

    const contacts: Contact[] = contactsData.map((contact) => {
      let parsedTags: string[] = [];
      try {
        if (contact.tags) {
          parsedTags = JSON.parse(contact.tags);
        }
      } catch (e) {
        console.error(`Failed to parse tags for contact ${contact.id}: ${contact.tags}`, e);
      }
      return {
        ...contact,
        tags: parsedTags,
        notes: [], // Notes should be fetched on demand in the contact detail view or with a more specific query
      };
    });
    
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('API Error fetching contacts:', error);
    let errorMessage = 'Failed to fetch contacts.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST a new contact
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { firstName, lastName, email, phone, companyId, tags, description, organizationId } = body; // Assuming organizationId is passed

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    // TODO: In a real multi-tenant app, organizationId should come from authenticated user's session or context
    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }


    const newContactId = generateId(); // Backend generates ID for the contact itself
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Contacts (id, firstName, lastName, email, phone, companyId, tags, description, createdAt, updatedAt, organizationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    stmt.run(
      newContactId,
      firstName,
      lastName,
      email,
      phone || null,
      companyId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      now,
      organizationId
    );

    const newContact: Contact = {
      id: newContactId,
      firstName,
      lastName,
      email,
      phone,
      companyId,
      tags: tags || [],
      description,
      notes: [], 
      createdAt: now,
      updatedAt: now,
      organizationId,
    };

    return NextResponse.json(newContact, { status: 201 });

  } catch (error) {
    console.error('API Error creating contact:', error);
     let errorMessage = 'Failed to create contact.';
    if (error instanceof Error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE' && (error as any).message.includes('Contacts.email') ) {
        errorMessage = 'A contact with this email already exists.';
        return NextResponse.json({ error: errorMessage }, { status: 409 }); // Conflict
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
