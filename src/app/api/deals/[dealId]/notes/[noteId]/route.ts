
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/services/activity-logger';

// DELETE a note for a deal, ensuring note belongs to user's organization
export async function DELETE(request: NextRequest, { params }: { params: { dealId: string, noteId: string } }) {
  try {
    const { dealId, noteId } = await params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const dealCheckStmt = db.prepare('SELECT name FROM Deals WHERE id = ? AND organizationId = ?');
    const dealData = dealCheckStmt.get(dealId, organizationId) as { name: string } | undefined;

    if (!dealData) {
      return NextResponse.json({ error: 'Deal not found or not authorized for note deletion' }, { status: 404 });
    }

    const noteStmt = db.prepare('SELECT content FROM Notes WHERE id = ? AND dealId = ? AND organizationId = ?');
    const noteToDelete = noteStmt.get(noteId, dealId, organizationId) as { content: string } | undefined;

    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND dealId = ? AND organizationId = ?');
    const result = stmt.run(noteId, dealId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_note_from_deal',
      entityType: 'deal',
      entityId: dealId,
      entityName: dealData.name,
      details: { noteId: noteId, noteContentPreview: noteToDelete?.content.substring(0, 50) }
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}
