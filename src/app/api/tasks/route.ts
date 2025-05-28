import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Task } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { logActivity } from "@/services/activity-logger"; // Added

// GET all tasks for the user's organization, with optional filters
export async function GET(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("dealId");
    const contactId = searchParams.get("contactId");

    let query = "SELECT * FROM Tasks WHERE organizationId = ?";
    const queryParams: any[] = [organizationId];

    if (dealId) {
      query += " AND relatedDealId = ?";
      queryParams.push(dealId);
    }
    if (contactId) {
      query += " AND relatedContactId = ?";
      queryParams.push(contactId);
    }

    query += " ORDER BY createdAt DESC";

    const stmtTasks = db.prepare(query);
    const tasksData = stmtTasks.all(...queryParams) as any[];

    const tasks: Task[] = tasksData.map((task) => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      completed: Boolean(task.completed),
    }));

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("API Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks." }, { status: 500 });
  }
}

// POST a new task for the user's organization
export async function POST(request: NextRequest) {
  try {
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
    const { title, description, dueDate, relatedDealId, relatedContactId, completed, tags } = body;

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const newTaskId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Tasks (id, title, description, dueDate, relatedDealId, relatedContactId, completed, tags, createdAt, updatedAt, organizationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      newTaskId,
      title,
      description || null,
      dueDate || null,
      relatedDealId === "_none_" ? null : relatedDealId || null,
      relatedContactId === "_none_" ? null : relatedContactId || null,
      completed ? 1 : 0,
      JSON.stringify(tags || []),
      now,
      now,
      organizationId
    );

    const newTask: Task = {
      id: newTaskId,
      title,
      description,
      dueDate,
      relatedDealId: relatedDealId === "_none_" ? undefined : relatedDealId,
      relatedContactId: relatedContactId === "_none_" ? undefined : relatedContactId,
      completed: Boolean(completed),
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
      organizationId: organizationId,
    };

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: "created_task",
      entityType: "task",
      entityId: newTaskId,
      entityName: title,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("API Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}
