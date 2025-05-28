import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Contact, Note } from "@/lib/types";
import { logActivity } from "@/services/activity-logger";

// GET a single contact by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = await params;
    const organizationId = request.headers.get("x-user-organization-id");
    if (!organizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Organization ID missing." },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }

    const stmtContact = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
              FROM Notes n WHERE n.contactId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Contacts c
      WHERE c.id = ? AND c.organizationId = ?
    `);
    const contactData = stmtContact.get(contactId, organizationId) as any;

    if (!contactData) {
      return NextResponse.json({ error: "Contact not found or not authorized" }, { status: 404 });
    }

    let parsedTags: string[] = [];
    try {
      if (contactData.tags) {
        parsedTags = JSON.parse(contactData.tags);
      }
    } catch (e) {
      console.error(`Failed to parse tags for contact ${contactId}: ${contactData.tags}`, e);
    }

    let parsedNotes: Note[] = [];
    try {
      if (contactData.notes_json) {
        parsedNotes = JSON.parse(contactData.notes_json);
      }
    } catch (e) {
      console.error(
        `Failed to parse notes_json for contact ${contactId}: ${contactData.notes_json}`,
        e
      );
    }

    const contact: Contact = {
      id: contactData.id,
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      companyId: contactData.companyId,
      description: contactData.description,
      createdAt: contactData.createdAt,
      updatedAt: contactData.updatedAt,
      tags: parsedTags,
      notes: parsedNotes,
      organizationId: contactData.organizationId,
    };

    return NextResponse.json(contact);
  } catch (error) {
    console.error(`API Error fetching contact ${params.contactId}:`, error);
    let errorMessage = "Failed to fetch contact.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT (update) an existing contact, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = await params;
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
    const { firstName, lastName, email, phone, companyId, tags, description } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Fetch current contact data for logging changes
    const stmtCurrentContact = db.prepare(
      "SELECT * FROM Contacts WHERE id = ? AND organizationId = ?"
    );
    const currentContactData = stmtCurrentContact.get(contactId, organizationId) as
      | Contact
      | undefined;

    if (!currentContactData) {
      return NextResponse.json(
        { error: "Contact not found or not authorized for update" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Contacts
       SET firstName = ?, lastName = ?, email = ?, phone = ?, companyId = ?,
           tags = ?, description = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?`
    );

    const result = stmt.run(
      firstName,
      lastName,
      email,
      phone || null,
      companyId === "_none_" ? null : companyId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      contactId,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Contact not found, not authorized, or no changes made" },
        { status: 404 }
      );
    }

    // Log activity with detailed changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    if (currentContactData.firstName !== firstName)
      changes.push({
        field: "First Name",
        oldValue: currentContactData.firstName,
        newValue: firstName,
      });
    if (currentContactData.lastName !== lastName)
      changes.push({
        field: "Last Name",
        oldValue: currentContactData.lastName,
        newValue: lastName,
      });
    if (currentContactData.email !== email)
      changes.push({ field: "Email", oldValue: currentContactData.email, newValue: email });
    if ((currentContactData.phone || null) !== (phone || null))
      changes.push({ field: "Phone", oldValue: currentContactData.phone, newValue: phone || null });
    if (
      (currentContactData.companyId || null) !== (companyId === "_none_" ? null : companyId || null)
    )
      changes.push({
        field: "Company ID",
        oldValue: currentContactData.companyId,
        newValue: companyId === "_none_" ? null : companyId || null,
      });
    if ((currentContactData.description || null) !== (description || null))
      changes.push({
        field: "Description",
        oldValue: currentContactData.description,
        newValue: description || null,
      });
    if (JSON.stringify(currentContactData.tags || []) !== JSON.stringify(tags || []))
      changes.push({ field: "Tags", oldValue: currentContactData.tags, newValue: tags || [] });

    if (changes.length > 0) {
      await logActivity({
        organizationId,
        userId,
        activityType: "updated_contact",
        entityType: "contact",
        entityId: contactId,
        entityName: `${firstName} ${lastName}`,
        details: { changes },
      });
    }

    const stmtUpdatedContact = db.prepare(`
        SELECT c.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
                FROM Notes n WHERE n.contactId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
        FROM Contacts c
        WHERE c.id = ? AND c.organizationId = ?
    `);
    const updatedContactDataRaw = stmtUpdatedContact.get(contactId, organizationId) as any;

    let parsedTagsUpdated: string[] = [];
    try {
      if (updatedContactDataRaw.tags) parsedTagsUpdated = JSON.parse(updatedContactDataRaw.tags);
    } catch (e) {
      console.error("Error parsing tags on update", e);
    }

    let parsedNotesUpdated: Note[] = [];
    try {
      if (updatedContactDataRaw.notes_json)
        parsedNotesUpdated = JSON.parse(updatedContactDataRaw.notes_json);
    } catch (e) {
      console.error("Error parsing notes_json on update", e);
    }

    const updatedContact: Contact = {
      id: updatedContactDataRaw.id,
      firstName: updatedContactDataRaw.firstName,
      lastName: updatedContactDataRaw.lastName,
      email: updatedContactDataRaw.email,
      phone: updatedContactDataRaw.phone,
      companyId: updatedContactDataRaw.companyId,
      description: updatedContactDataRaw.description,
      createdAt: updatedContactDataRaw.createdAt,
      updatedAt: updatedContactDataRaw.updatedAt,
      tags: parsedTagsUpdated,
      notes: parsedNotesUpdated,
      organizationId: updatedContactDataRaw.organizationId,
    };

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.error(`API Error updating contact ${params.contactId}:`, error);
    let errorMessage = "Failed to update contact.";
    if (error instanceof Error && (error as any).code === "SQLITE_CONSTRAINT_UNIQUE") {
      errorMessage = "A contact with this email already exists.";
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE a contact, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { contactId: string } }) {
  try {
    const { contactId } = await params;
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

    const contactCheckStmt = db.prepare(
      "SELECT firstName, lastName FROM Contacts WHERE id = ? AND organizationId = ?"
    );
    const contactToDeleteData = contactCheckStmt.get(contactId, organizationId) as
      | { firstName: string; lastName: string }
      | undefined;

    if (!contactToDeleteData) {
      return NextResponse.json({ error: "Contact not found or not authorized" }, { status: 404 });
    }
    const contactName = `${contactToDeleteData.firstName} ${contactToDeleteData.lastName}`;

    db.transaction(() => {
      const stmtUpdateTasks = db.prepare(
        "UPDATE Tasks SET relatedContactId = NULL WHERE relatedContactId = ? AND organizationId = ?"
      );
      stmtUpdateTasks.run(contactId, organizationId);

      const stmtUpdateDeals = db.prepare(
        "UPDATE Deals SET contactId = NULL WHERE contactId = ? AND organizationId = ?"
      );
      stmtUpdateDeals.run(contactId, organizationId);

      const stmtDeleteNotes = db.prepare(
        "DELETE FROM Notes WHERE contactId = ? AND organizationId = ?"
      );
      stmtDeleteNotes.run(contactId, organizationId);

      const stmtDeleteContact = db.prepare(
        "DELETE FROM Contacts WHERE id = ? AND organizationId = ?"
      );
      const result = stmtDeleteContact.run(contactId, organizationId);

      if (result.changes === 0) {
        const notFoundError = new Error("Contact not found or not authorized during transaction");
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }
    })();

    await logActivity({
      organizationId,
      userId,
      activityType: "deleted_contact",
      entityType: "contact",
      entityId: contactId,
      entityName: contactName,
    });

    return NextResponse.json({ message: "Contact deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error deleting contact ${params.contactId}:`, error);
    if (error.statusCode === 404) {
      return NextResponse.json({ error: "Contact not found or not authorized" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete contact." }, { status: 500 });
  }
}
