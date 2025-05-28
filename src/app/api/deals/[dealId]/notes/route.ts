import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Note } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { logActivity } from "@/services/activity-logger";

// POST a new note for a deal, ensuring deal belongs to user's organization
export async function POST(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const organizationId = request.headers.get("x-user-organization-id");
    const userId = request.headers.get("x-user-id");

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

    const dealCheckStmt = db.prepare(
      "SELECT id, name FROM Deals WHERE id = ? AND organizationId = ?"
    );
    const dealData = dealCheckStmt.get(dealId, organizationId) as
      | { id: string; name: string }
      | undefined;
    if (!dealData) {
      return NextResponse.json({ error: "Deal not found or not authorized" }, { status: 404 });
    }

    const newNoteId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      "INSERT INTO Notes (id, content, createdAt, dealId, organizationId) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(newNoteId, content.trim(), now, dealId, organizationId);

    const newNote: Note = {
      id: newNoteId,
      content: content.trim(),
      createdAt: now,
      dealId: dealId,
      organizationId: organizationId,
    };

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: "added_note_to_deal",
      entityType: "deal",
      entityId: dealId,
      entityName: dealData.name,
      details: { noteId: newNoteId, noteContentPreview: content.trim().substring(0, 50) },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error(`API Error adding note to deal ${params.dealId}:`, error);
    return NextResponse.json({ error: "Failed to add note." }, { status: 500 });
  }
}
