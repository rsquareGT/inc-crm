
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/utils'; // Updated import

// POST a new note for a deal
export async function POST(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { content, organizationId } = body; // Assuming organizationId is passed

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }
    // TODO: In a real multi-tenant app, organizationId should come from authenticated user's session or context,
    // or be derived from the parent deal's organizationId
    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required for the note' }, { status: 400 });
    }


    // Check if deal exists and belongs to the organization
    const dealCheckStmt = db.prepare('SELECT id FROM Deals WHERE id = ? AND organizationId = ?');
    const dealExists = dealCheckStmt.get(dealId, organizationId);
    if (!dealExists) {
      return NextResponse.json({ error: 'Deal not found or not associated with the organization' }, { status: 404 });
    }

    const newNoteId = generateId(); // Generate ID server-side
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO Notes (id, content, createdAt, dealId, organizationId) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(newNoteId, content.trim(), now, dealId, organizationId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
      dealId: dealId,
      organizationId: organizationId,
    };

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error(`API Error adding note to deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to add note.' }, { status: 500 });
  }
}
