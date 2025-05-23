
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // Using generateId for new entities

// POST a new note for a contact
export async function POST(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { content, organizationId } = body; // Assuming organizationId is passed

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }
    // TODO: In a real multi-tenant app, organizationId should come from authenticated user's session or context,
    // or be derived from the parent contact's organizationId
    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required for the note' }, { status: 400 });
    }

    // Check if contact exists and belongs to the organization
    const contactCheckStmt = db.prepare('SELECT id FROM Contacts WHERE id = ? AND organizationId = ?');
    const contactExists = contactCheckStmt.get(contactId, organizationId);
    if (!contactExists) {
      return NextResponse.json({ error: 'Contact not found or not associated with the organization' }, { status: 404 });
    }

    const newNoteId = generateId(); // Generate ID server-side
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO Notes (id, content, createdAt, contactId, organizationId) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(newNoteId, content.trim(), now, contactId, organizationId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
      contactId: contactId,
      organizationId: organizationId,
    };

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error(`API Error adding note to contact ${params.contactId}:`, error);
    return NextResponse.json({ error: 'Failed to add note.' }, { status: 500 });
  }
}
