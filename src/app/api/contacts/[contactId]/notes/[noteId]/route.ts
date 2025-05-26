import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/services/activity-logger'; // Added

// DELETE a note for a contact, ensuring note belongs to user's organization
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string, noteId: string } }) {
  try {
    const { contactId, noteId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging
    
    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Fetch contact name for logging
    const contactCheckStmt = db.prepare('SELECT firstName, lastName FROM Contacts WHERE id = ? AND organizationId = ?');
    const contactData = contactCheckStmt.get(contactId, organizationId) as { firstName: string; lastName: string } | undefined;

    if (!contactData) {
      return NextResponse.json({ error: 'Contact not found or not authorized for note deletion' }, { status: 404 });
    }

    // Fetch note content for logging preview (optional)
    const noteStmt = db.prepare('SELECT content FROM Notes WHERE id = ? AND contactId = ? AND organizationId = ?');
    const noteToDelete = noteStmt.get(noteId, contactId, organizationId) as { content: string } | undefined;


    const stmt = db.prepare('DELETE FROM Notes WHERE id = ? AND contactId = ? AND organizationId = ?');
    const result = stmt.run(noteId, contactId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found or not authorized' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_note_from_contact',
      entityType: 'contact',
      entityId: contactId,
      entityName: `${contactData.firstName} ${contactData.lastName}`,
      details: { noteId: noteId, noteContentPreview: noteToDelete?.content.substring(0, 50) }
    });

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting note ${params.noteId} for contact ${params.contactId}:`, error);
    return NextResponse.json({ error: 'Failed to delete note.' }, { status: 500 });
  }
}