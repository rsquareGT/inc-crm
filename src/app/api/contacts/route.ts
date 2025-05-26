
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Contact, Note } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logActivity } from '@/services/activity-logger'; // Added

// GET all contacts or contacts by companyId for the user's organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    let query = `
      SELECT c.*
      FROM Contacts c
      WHERE c.organizationId = ?
    `;
    const queryParams: any[] = [organizationId];

    if (companyId) {
      query += ' AND c.companyId = ?';
      queryParams.push(companyId);
    }

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
      // For list view, we might not need full notes. Fetch on demand for detail view.
      // If notes are needed here, a subquery or JOIN would be added.
      return {
        ...contact,
        tags: parsedTags,
        notes: [], // Notes are typically fetched in detail view or via separate endpoint
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

// POST a new contact for the user's organization
export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging

    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }
     if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing for logging.' }, { status: 401 });
    }


    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { firstName, lastName, email, phone, companyId, tags, description } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const newContactId = generateId();
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
      companyId === '_none_' ? null : companyId || null,
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
      companyId: companyId === '_none_' ? undefined : companyId,
      tags: tags || [],
      description,
      notes: [],
      createdAt: now,
      updatedAt: now,
      organizationId,
    };

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'created_contact',
      entityType: 'contact',
      entityId: newContactId,
      entityName: `${firstName} ${lastName}`,
    });

    return NextResponse.json(newContact, { status: 201 });

  } catch (error) {
    console.error('API Error creating contact:', error);
     let errorMessage = 'Failed to create contact.';
    if (error instanceof Error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE' && (error as any).message.includes('Contacts.email') ) {
        errorMessage = 'A contact with this email already exists.';
        return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
