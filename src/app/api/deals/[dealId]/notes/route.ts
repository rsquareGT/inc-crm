
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // Using generateId for new entities

// POST a new note for a deal
export async function POST(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }

    // Check if deal exists
    const dealCheckStmt = db.prepare('SELECT id FROM Deals WHERE id = ?');
    const dealExists = dealCheckStmt.get(dealId);
    if (!dealExists) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const newNoteId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO Notes (id, content, createdAt, dealId) VALUES (?, ?, ?, ?)'
    );
    stmt.run(newNoteId, content.trim(), now, dealId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
    };

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error(`API Error adding note to deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to add note.' }, { status: 500 });
  }
}
