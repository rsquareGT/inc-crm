
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/utils';

// POST a new note for a deal, ensuring deal belongs to user's organization
export async function POST(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }

    // Check if deal exists and belongs to the organization
    const dealCheckStmt = db.prepare('SELECT id FROM Deals WHERE id = ? AND organizationId = ?');
    const dealExists = dealCheckStmt.get(dealId, organizationId);
    if (!dealExists) {
      return NextResponse.json({ error: 'Deal not found or not authorized' }, { status: 404 });
    }

    const newNoteId = generateId();
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
