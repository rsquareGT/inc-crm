
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Task } from '@/lib/types';
import { generateId } from '@/lib/utils'; // Updated import

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const contactId = searchParams.get('contactId');
    // TODO: Add organizationId filtering based on authenticated user

    let query = 'SELECT * FROM Tasks';
    const queryParams: any[] = [];
    let whereClauseAdded = false;

    const addWhereOrAnd = () => {
        if (whereClauseAdded) return ' AND';
        whereClauseAdded = true;
        return ' WHERE';
    }

    if (dealId) {
      query += `${addWhereOrAnd()} relatedDealId = ?`;
      queryParams.push(dealId);
    }
    if (contactId) { // Changed from else if
      query += `${addWhereOrAnd()} relatedContactId = ?`;
      queryParams.push(contactId);
    }
    // TODO: Add organizationId to WHERE clause
    // if (organizationId) {
    //   query += `${addWhereOrAnd()} organizationId = ?`;
    //   queryParams.push(organizationId);
    // }
    
    query += ' ORDER BY createdAt DESC';

    const stmtTasks = db.prepare(query);
    const tasksData = stmtTasks.all(...queryParams) as any[];

    const tasks: Task[] = tasksData.map((task) => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      completed: Boolean(task.completed), 
    }));
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('API Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks.' }, { status: 500 });
  }
}

// POST a new task
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { title, description, dueDate, relatedDealId, relatedContactId, completed, tags, organizationId } = body; // Assuming organizationId is passed

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }
    // TODO: In a real multi-tenant app, organizationId should come from authenticated user's session or context
    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const newTaskId = generateId(); // Backend generates ID
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
      relatedDealId || null,
      relatedContactId || null,
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
      relatedDealId,
      relatedContactId,
      completed: Boolean(completed),
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
      organizationId,
    };

    return NextResponse.json(newTask, { status: 201 });

  } catch (error) {
    console.error('API Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
}
