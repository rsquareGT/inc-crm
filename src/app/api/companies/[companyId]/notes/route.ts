
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // Using generateId for new entities

// POST a new note for a company
export async function POST(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }

    // Check if company exists
    const companyCheckStmt = db.prepare('SELECT id FROM Companies WHERE id = ?');
    const companyExists = companyCheckStmt.get(companyId);
    if (!companyExists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const newNoteId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO Notes (id, content, createdAt, companyId) VALUES (?, ?, ?, ?)'
    );
    stmt.run(newNoteId, content.trim(), now, companyId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
    };

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error(`API Error adding note to company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to add note.' }, { status: 500 });
  }
}
