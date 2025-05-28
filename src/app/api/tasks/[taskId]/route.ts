import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Task } from "@/lib/types";
import { logActivity } from "@/services/activity-logger";

// GET a single task by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = await params;
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

    const stmtTask = db.prepare("SELECT * FROM Tasks WHERE id = ? AND organizationId = ?");
    const taskData = stmtTask.get(taskId, organizationId) as any;

    if (!taskData) {
      return NextResponse.json({ error: "Task not found or not authorized" }, { status: 404 });
    }

    const task: Task = {
      ...taskData,
      tags: taskData.tags ? JSON.parse(taskData.tags) : [],
      completed: Boolean(taskData.completed),
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error(`API Error fetching task ${params.taskId}:`, error);
    return NextResponse.json({ error: "Failed to fetch task." }, { status: 500 });
  }
}

// PUT (update) an existing task, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = await params;
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
    const { title, description, dueDate, relatedDealId, relatedContactId, completed, tags } = body;

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    // Fetch current task data for logging changes
    const stmtCurrentTask = db.prepare("SELECT * FROM Tasks WHERE id = ? AND organizationId = ?");
    const currentTaskData = stmtCurrentTask.get(taskId, organizationId) as Task | undefined;

    if (!currentTaskData) {
      return NextResponse.json(
        { error: "Task not found or not authorized for update" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Tasks
       SET title = ?, description = ?, dueDate = ?, relatedDealId = ?,
           relatedContactId = ?, completed = ?, tags = ?, updatedAt = ?
       WHERE id = ? AND organizationId = ?`
    );

    const result = stmt.run(
      title,
      description || null,
      dueDate || null,
      relatedDealId === "_none_" ? null : relatedDealId || null,
      relatedContactId === "_none_" ? null : relatedContactId || null,
      completed ? 1 : 0,
      JSON.stringify(tags || []),
      now,
      taskId,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Task not found, not authorized, or no changes made" },
        { status: 404 }
      );
    }

    // Log activity with detailed changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    let activityType: "completed_task" | "updated_task" = "updated_task";

    if (currentTaskData.title !== title)
      changes.push({ field: "Title", oldValue: currentTaskData.title, newValue: title });
    if ((currentTaskData.description || null) !== (description || null))
      changes.push({
        field: "Description",
        oldValue: currentTaskData.description,
        newValue: description || null,
      });
    if ((currentTaskData.dueDate || null) !== (dueDate || null))
      changes.push({
        field: "Due Date",
        oldValue: currentTaskData.dueDate,
        newValue: dueDate || null,
      });
    if (
      (currentTaskData.relatedDealId || null) !==
      (relatedDealId === "_none_" ? null : relatedDealId || null)
    )
      changes.push({
        field: "Related Deal ID",
        oldValue: currentTaskData.relatedDealId,
        newValue: relatedDealId === "_none_" ? null : relatedDealId || null,
      });
    if (
      (currentTaskData.relatedContactId || null) !==
      (relatedContactId === "_none_" ? null : relatedContactId || null)
    )
      changes.push({
        field: "Related Contact ID",
        oldValue: currentTaskData.relatedContactId,
        newValue: relatedContactId === "_none_" ? null : relatedContactId || null,
      });
    if (currentTaskData.completed !== completed) {
      changes.push({
        field: "Status",
        oldValue: currentTaskData.completed ? "Completed" : "Incomplete",
        newValue: completed ? "Completed" : "Incomplete",
      });
      if (completed && !currentTaskData.completed) {
        // Marked as complete for the first time (or from incomplete)
        activityType = "completed_task";
      }
    }
    if (JSON.stringify(currentTaskData.tags || []) !== JSON.stringify(tags || []))
      changes.push({ field: "Tags", oldValue: currentTaskData.tags, newValue: tags || [] });

    if (changes.length > 0) {
      await logActivity({
        organizationId,
        userId,
        activityType: activityType, // Use specific type if task was completed
        entityType: "task",
        entityId: taskId,
        entityName: title, // Log with new title
        details: { changes },
      });
    }

    const stmtUpdatedTask = db.prepare("SELECT * FROM Tasks WHERE id = ? AND organizationId = ?");
    const updatedTaskData = stmtUpdatedTask.get(taskId, organizationId) as any;
    const updatedTask: Task = {
      ...updatedTaskData,
      tags: updatedTaskData.tags ? JSON.parse(updatedTaskData.tags) : [],
      completed: Boolean(updatedTaskData.completed),
    };

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(`API Error updating task ${params.taskId}:`, error);
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }
}

// DELETE a task, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = await params;
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

    const taskCheckStmt = db.prepare("SELECT title FROM Tasks WHERE id = ? AND organizationId = ?");
    const taskToDeleteData = taskCheckStmt.get(taskId, organizationId) as
      | { title: string }
      | undefined;

    if (!taskToDeleteData) {
      return NextResponse.json({ error: "Task not found or not authorized" }, { status: 404 });
    }
    const taskTitle = taskToDeleteData.title;

    const stmtDeleteTask = db.prepare("DELETE FROM Tasks WHERE id = ? AND organizationId = ?");
    const result = stmtDeleteTask.run(taskId, organizationId);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Task not found or not authorized" }, { status: 404 });
    }

    await logActivity({
      organizationId,
      userId,
      activityType: "deleted_task",
      entityType: "task",
      entityId: taskId,
      entityName: taskTitle,
    });

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(`API Error deleting task ${params.taskId}:`, error);
    return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  }
}
