
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Task } from '@/lib/types';
import { logActivity } from '@/services/activity-logger'; // Added

// GET a single task by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtTask = db.prepare('SELECT * FROM Tasks WHERE id = ? AND organizationId = ?');
    const taskData = stmtTask.get(taskId, organizationId) as any;

    if (!taskData) {
      return NextResponse.json({ error: 'Task not found or not authorized' }, { status: 404 });
    }

    const task: Task = {
      ...taskData,
      tags: taskData.tags ? JSON.parse(taskData.tags) : [],
      completed: Boolean(taskData.completed),
    };

    return NextResponse.json(task);
  } catch (error) {
    console.error(`API Error fetching task ${params.taskId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch task.' }, { status: 500 });
  }
}

// PUT (update) an existing task, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { title, description, dueDate, relatedDealId, relatedContactId, completed, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    // Fetch current task for logging comparison if needed
    const stmtCurrentTask = db.prepare('SELECT title, completed FROM Tasks WHERE id = ? AND organizationId = ?');
    const currentTaskData = stmtCurrentTask.get(taskId, organizationId) as { title: string; completed: number } | undefined;

    if (!currentTaskData) {
        return NextResponse.json({ error: 'Task not found or not authorized for update' }, { status: 404 });
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
      relatedDealId === '_none_' ? null : relatedDealId || null,
      relatedContactId === '_none_' ? null : relatedContactId || null,
      completed ? 1 : 0,
      JSON.stringify(tags || []),
      now,
      taskId,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Task not found, not authorized, or no changes made' }, { status: 404 });
    }

    // Log activity
    let activityType: 'completed_task' | 'updated_task' = 'updated_task';
    if (currentTaskData.completed === 0 && completed === true) { // Was not completed, now is
        activityType = 'completed_task';
    }
    
    await logActivity({
      organizationId,
      userId,
      activityType: activityType,
      entityType: 'task',
      entityId: taskId,
      entityName: title, // Log with new title
    });


    const stmtUpdatedTask = db.prepare('SELECT * FROM Tasks WHERE id = ? AND organizationId = ?');
    const updatedTaskData = stmtUpdatedTask.get(taskId, organizationId) as any;
    const updatedTask: Task = {
      ...updatedTaskData,
      tags: updatedTaskData.tags ? JSON.parse(updatedTaskData.tags) : [],
      completed: Boolean(updatedTaskData.completed),
    };

    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error(`API Error updating task ${params.taskId}:`, error);
    return NextResponse.json({ error: 'Failed to update task.' }, { status: 500 });
  }
}

// DELETE a task, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id'); // For activity logging

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Fetch task title for logging
    const taskCheckStmt = db.prepare('SELECT title FROM Tasks WHERE id = ? AND organizationId = ?');
    const taskToDeleteData = taskCheckStmt.get(taskId, organizationId) as { title: string } | undefined;

    if (!taskToDeleteData) {
      return NextResponse.json({ error: 'Task not found or not authorized' }, { status: 404 });
    }
    const taskTitle = taskToDeleteData.title;

    const stmtDeleteTask = db.prepare('DELETE FROM Tasks WHERE id = ? AND organizationId = ?');
    const result = stmtDeleteTask.run(taskId, organizationId);

    if (result.changes === 0) {
      // Should have been caught by taskCheckStmt, but as a fallback
      return NextResponse.json({ error: 'Task not found or not authorized' }, { status: 404 });
    }

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: 'deleted_task',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
    });

    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting task ${params.taskId}:`, error);
    return NextResponse.json({ error: 'Failed to delete task.' }, { status: 500 });
  }
}
