
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Contact, Note } from '@/lib/types';
import { logActivity } from '@/services/activity-logger'; // Added

// GET a single contact by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtContact = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
              FROM Notes n WHERE n.contactId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Contacts c
      WHERE c.id = ? AND c.organizationId = ?
    `);
    const contactData = stmtContact.get(contactId, organizationId) as any;

    if (!contactData) {
      return NextResponse.json({ error: 'Contact not found or not authorized' }, { status: 404 });
    }

    let parsedTags: string[] = [];
    try {
      if (contactData.tags) {
        parsedTags = JSON.parse(contactData.tags);
      }
    } catch (e) {
      console.error(`Failed to parse tags for contact ${contactId}: ${contactData.tags}`, e);
      // Potentially return error or default to empty, here defaulting to empty
    }

    let parsedNotes: Note[] = [];
    try {
      if (contactData.notes_json) {
        parsedNotes = JSON.parse(contactData.notes_json);
      }
    } catch (e) {
      console.error(`Failed to parse notes_json for contact ${contactId}: ${contactData.notes_json}`, e);
      // Potentially return error or default to empty
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
      organizationId: contactData.organizationId,
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

// PUT (update) an existing contact, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

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
       WHERE id = ? AND organizationId = ?`
    );

    const result = stmt.run(
      firstName,
      lastName,
      email,
      phone || null,
      companyId === '_none_' ? null : companyId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      contactId,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Contact not found, not authorized, or no changes made' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'updated_contact',
      entityType: 'contact',
      entityId: contactId,
      entityName: `${firstName} ${lastName}`, // Log with new name
    });


    const stmtUpdatedContact = db.prepare(`
        SELECT c.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
                FROM Notes n WHERE n.contactId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
        FROM Contacts c
        WHERE c.id = ? AND c.organizationId = ?
    `);
    const updatedContactData = stmtUpdatedContact.get(contactId, organizationId) as any;

    let parsedTagsUpdated: string[] = [];
    try {
      if (updatedContactData.tags) parsedTagsUpdated = JSON.parse(updatedContactData.tags);
    } catch (e) { console.error("Error parsing tags on update", e); }

    let parsedNotesUpdated: Note[] = [];
    try {
      if (updatedContactData.notes_json) parsedNotesUpdated = JSON.parse(updatedContactData.notes_json);
    } catch (e) { console.error("Error parsing notes_json on update", e); }

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
      organizationId: updatedContactData.organizationId,
    };

    return NextResponse.json(updatedContact);

  } catch (error) {
    console.error(`API Error updating contact ${params.contactId}:`, error);
    let errorMessage = 'Failed to update contact.';
     if (error instanceof Error && (error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        errorMessage = 'A contact with this email already exists.';
        return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE a contact, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    
    // Fetch contact name for logging before deletion
    const contactCheckStmt = db.prepare('SELECT firstName, lastName FROM Contacts WHERE id = ? AND organizationId = ?');
    const contactToDeleteData = contactCheckStmt.get(contactId, organizationId) as { firstName: string; lastName: string } | undefined;

    if (!contactToDeleteData) {
      return NextResponse.json({ error: 'Contact not found or not authorized' }, { status: 404 });
    }
    const contactName = `${contactToDeleteData.firstName} ${contactToDeleteData.lastName}`;

    db.transaction(() => {
      const stmtUpdateTasks = db.prepare('UPDATE Tasks SET relatedContactId = NULL WHERE relatedContactId = ? AND organizationId = ?');
      stmtUpdateTasks.run(contactId, organizationId);

      const stmtUpdateDeals = db.prepare('UPDATE Deals SET contactId = NULL WHERE contactId = ? AND organizationId = ?');
      stmtUpdateDeals.run(contactId, organizationId);
      
      const stmtDeleteContact = db.prepare('DELETE FROM Contacts WHERE id = ? AND organizationId = ?');
      const result = stmtDeleteContact.run(contactId, organizationId);

      if (result.changes === 0) {
        // This case should be caught by contactExists check, but as a fallback
        const notFoundError = new Error('Contact not found or not authorized during transaction');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }
    })();

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_contact',
      entityType: 'contact',
      entityId: contactId,
      entityName: contactName, // Log with name fetched before deletion
    });

    return NextResponse.json({ message: 'Contact deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error deleting contact ${params.contactId}:`, error);
    if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Contact not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete contact.' }, { status: 500 });
  }
}
