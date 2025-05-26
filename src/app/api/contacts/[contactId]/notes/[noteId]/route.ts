
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

// DELETE a note for a contact, ensuring note belongs to user's organization
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string, noteId: string } }) {
  try {
    const { contactId, noteId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND contactId = ? AND organizationId = ?');
    const result = stmt.run(noteId, contactId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for contact ${params.contactId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
