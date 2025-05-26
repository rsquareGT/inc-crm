
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';
import { generateId } from '@/lib/utils';

// POST a new note for a company, ensuring company belongs to user's organization
export async function POST(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
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

    // Check if company exists and belongs to the organization
    const companyCheckStmt = db.prepare('SELECT id FROM Companies WHERE id = ? AND organizationId = ?');
    const companyExists = companyCheckStmt.get(companyId, organizationId);
    if (!companyExists) {
      return NextResponse.json({ error: 'Company not found or not authorized' }, { status: 404 });
    }

    const newNoteId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      'INSERT INTO Notes (id, content, createdAt, companyId, organizationId) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(newNoteId, content.trim(), now, companyId, organizationId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
      companyId: companyId,
      organizationId: organizationId,
    };

    return NextResponse.json(newNote, { status: 201 });

  } catch (error) {
    console.error(`API Error adding note to company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to add note.' }, { status: 500 });
  }
}
