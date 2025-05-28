import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Note } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { logActivity } from "@/services/activity-logger"; // Added

// POST a new note for a contact, ensuring contact belongs to user's organization
export async function POST(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = await params;
    const organizationId = request.headers.get("x-user-organization-id");
    const userId = request.headers.get("x-user-id"); // For activity logging

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized: Organization or User ID missing." },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Note content cannot be empty" }, { status: 400 });
    }

    // Check if contact exists and belongs to the organization, also get name for logging
    const contactCheckStmt = db.prepare(
      "SELECT id, firstName, lastName FROM Contacts WHERE id = ? AND organizationId = ?"
    );
    const contactData = contactCheckStmt.get(contactId, organizationId) as
      | { id: string; firstName: string; lastName: string }
      | undefined;
    if (!contactData) {
      return NextResponse.json({ error: "Contact not found or not authorized" }, { status: 404 });
    }

    const newNoteId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      "INSERT INTO Notes (id, content, createdAt, contactId, organizationId) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(newNoteId, content.trim(), now, contactId, organizationId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
      contactId: contactId,
      organizationId: organizationId,
    };

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: "added_note_to_contact",
      entityType: "contact",
      entityId: contactId,
      entityName: `${contactData.firstName} ${contactData.lastName}`,
      details: { noteId: newNoteId, noteContentPreview: content.trim().substring(0, 50) },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error(`API Error adding note to contact ${params.contactId}:`, error);
    return NextResponse.json({ error: "Failed to add note." }, { status: 500 });
  }
}
