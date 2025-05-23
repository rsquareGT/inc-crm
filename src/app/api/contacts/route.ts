
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Contact, Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // For generating IDs for new notes

// GET all contacts or contacts by companyId
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Temporarily removed notes_json subquery for diagnostic purposes.
    // Original subquery:
    // (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
    //  FROM Notes n WHERE n.contactId = c.id ORDER BY n.createdAt DESC) as notes_json
    let query = `
      SELECT c.*
      FROM Contacts c
    `;
    const params: any[] = [];

    if (companyId) {
      query += ' WHERE c.companyId = ?';
      params.push(companyId);
    }
    
    query += ' ORDER BY c.lastName ASC, c.firstName ASC';

    const stmtContacts = db.prepare(query);
    const contactsData = stmtContacts.all(...params) as any[];

    const contacts: Contact[] = contactsData.map((contact) => ({
      ...contact,
      tags: contact.tags ? JSON.parse(contact.tags) : [],
      // notes: contact.notes_json ? JSON.parse(contact.notes_json) : [], // Temporarily not fetching notes
      notes: [], // DIAGNOSTIC: Return empty notes array for now
    }));
    
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
    const { firstName, lastName, email, phone, companyId, tags, description } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const newContactId = generateId(); // Backend generates ID for the contact itself
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Contacts (id, firstName, lastName, email, phone, companyId, tags, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      now
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
      notes: [], // New contact starts with no notes via this endpoint
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(newContact, { status: 201 });

  } catch (error) {
    console.error('API Error creating contact:', error);
     let errorMessage = 'Failed to create contact.';
    if (error instanceof Error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        errorMessage = 'A contact with this email already exists.';
        return NextResponse.json({ error: errorMessage }, { status: 409 }); // Conflict
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
