
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Contact, Note } from '@/lib/types';

// GET a single contact by ID
export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtContact = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
              FROM Notes n WHERE n.contactId = c.id ORDER BY n.createdAt DESC) as notes_json
      FROM Contacts c
      WHERE c.id = ?
    `);
    const contactData = stmtContact.get(contactId) as any;

    if (!contactData) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    let parsedTags: string[] = [];
    try {
      if (contactData.tags) {
        parsedTags = JSON.parse(contactData.tags);
      }
    } catch (e) {
      console.error(`Failed to parse tags for contact ${contactId}: ${contactData.tags}`, e);
      // Default to empty array, error logged on server
    }

    let parsedNotes: Note[] = [];
    try {
      if (contactData.notes_json) {
        parsedNotes = JSON.parse(contactData.notes_json);
      }
    } catch (e) {
      console.error(`Failed to parse notes_json for contact ${contactId}: ${contactData.notes_json}`, e);
      // Default to empty array, error logged on server
    }

    const contact: Contact = {
      id: contactData.id,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      companyId: contactData.companyId,
      description: contactData.description,
      createdAt: contactData.createdAt,
      updatedAt: contactData.updatedAt,
      tags: parsedTags,
      notes: parsedNotes,
    };

    return NextResponse.json(contact);
  } catch (error) {
    console.error(`API Error fetching contact ${params.contactId}:`, error);
    let errorMessage = 'Failed to fetch contact.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT (update) an existing contact
export async function PUT(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { firstName, lastName, email, phone, companyId, tags, description } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Contacts 
       SET firstName = ?, lastName = ?, email = ?, phone = ?, companyId = ?, 
           tags = ?, description = ?, updatedAt = ?
       WHERE id = ?`
    );
    
    const result = stmt.run(
      firstName,
      lastName,
      email,
      phone || null,
      companyId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      contactId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Contact not found or no changes made' }, { status: 404 });
    }
    
    // Fetch the updated contact to return it, including notes
    const stmtUpdatedContact = db.prepare(`
        SELECT c.*, 
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
                FROM Notes n WHERE n.contactId = c.id ORDER BY n.createdAt DESC) as notes_json
        FROM Contacts c 
        WHERE c.id = ?
    `);
    const updatedContactData = stmtUpdatedContact.get(contactId) as any;

    let parsedTagsUpdated: string[] = [];
    try {
      if (updatedContactData.tags) {
        parsedTagsUpdated = JSON.parse(updatedContactData.tags);
      }
    } catch (e) {
      console.error(`Failed to parse tags for updated contact ${contactId}: ${updatedContactData.tags}`, e);
    }

    let parsedNotesUpdated: Note[] = [];
    try {
      if (updatedContactData.notes_json) {
        parsedNotesUpdated = JSON.parse(updatedContactData.notes_json);
      }
    } catch (e) {
      console.error(`Failed to parse notes_json for updated contact ${contactId}: ${updatedContactData.notes_json}`, e);
    }
    
    const updatedContact: Contact = {
      id: updatedContactData.id,
      firstName: updatedContactData.firstName,
      lastName: updatedContactData.lastName,
      email: updatedContactData.email,
      phone: updatedContactData.phone,
      companyId: updatedContactData.companyId,
      description: updatedContactData.description,
      createdAt: updatedContactData.createdAt,
      updatedAt: updatedContactData.updatedAt,
      tags: parsedTagsUpdated,
      notes: parsedNotesUpdated,
    };

    return NextResponse.json(updatedContact);

  } catch (error) {
    console.error(`API Error updating contact ${params.contactId}:`, error);
    let errorMessage = 'Failed to update contact.';
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

// DELETE a contact
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Related notes are set to ON DELETE CASCADE in schema.
    // Need to consider related Tasks (relatedContactId SET NULL) and Deals (contactId SET NULL).
    
    const stmtUpdateTasks = db.prepare('UPDATE Tasks SET relatedContactId = NULL WHERE relatedContactId = ?');
    stmtUpdateTasks.run(contactId);

    const stmtUpdateDeals = db.prepare('UPDATE Deals SET contactId = NULL WHERE contactId = ?');
    stmtUpdateDeals.run(contactId);
    
    const stmtDeleteContact = db.prepare('DELETE FROM Contacts WHERE id = ?');
    const result = stmtDeleteContact.run(contactId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting contact ${params.contactId}:`, error);
    return NextResponse.json({ error: 'Failed to delete contact.' }, { status: 500 });
  }
}
