
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

// DELETE a note for a company, ensuring note belongs to user's organization
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string, noteId: string } }) {
  try {
    const { companyId, noteId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Ensure the note (and by extension its parent company) belongs to the organization
    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND companyId = ? AND organizationId = ?');
    const result = stmt.run(noteId, companyId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
