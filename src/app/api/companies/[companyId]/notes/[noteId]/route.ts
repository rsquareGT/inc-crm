
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/services/activity-logger';

// DELETE a note for a company, ensuring note belongs to user's organization
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string, noteId: string } }) {
  try {
    const { companyId, noteId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Fetch company name for logging
    const companyCheckStmt = db.prepare('SELECT name FROM Companies WHERE id = ? AND organizationId = ?');
    const companyData = companyCheckStmt.get(companyId, organizationId) as { name: string } | undefined;
    
    if (!companyData) {
      return NextResponse.json({ error: 'Company not found or not authorized for note deletion' }, { status: 404 });
    }

    // Fetch note content for logging preview (optional)
    const noteStmt = db.prepare('SELECT content FROM Notes WHERE id = ? AND companyId = ? AND organizationId = ?');
    const noteToDelete = noteStmt.get(noteId, companyId, organizationId) as { content: string } | undefined;

    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND companyId = ? AND organizationId = ?');
    const result = stmt.run(noteId, companyId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_note_from_company',
      entityType: 'company',
      entityId: companyId,
      entityName: companyData.name,
      details: { noteId: noteId, noteContentPreview: noteToDelete?.content.substring(0, 50) }
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for company ${params.companyId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
