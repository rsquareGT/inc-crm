
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

// DELETE a note for a deal
export async function DELETE(request: NextRequest, { params }: { params: { dealId: string, noteId: string } }) {
  try {
    const { dealId, noteId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND dealId = ?');
    const result = stmt.run(noteId, dealId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not associated with this deal' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
