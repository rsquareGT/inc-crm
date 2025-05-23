
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Task } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // For generating IDs for new entities

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const contactId = searchParams.get('contactId'); // For future use if listing tasks by contact

    let query = 'SELECT * FROM Tasks';
    const params: any[] = [];

    if (dealId) {
      query += ' WHERE relatedDealId = ?';
      params.push(dealId);
    } else if (contactId) {
      // Example: If you want to filter tasks by contactId in the future
      // query += ' WHERE relatedContactId = ?';
      // params.push(contactId);
    }
    
    query += ' ORDER BY createdAt DESC';

    const stmtTasks = db.prepare(query);
    const tasksData = stmtTasks.all(...params) as any[];

    const tasks: Task[] = tasksData.map((task) => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      completed: Boolean(task.completed), // Ensure boolean
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
    const { title, description, dueDate, relatedDealId, relatedContactId, completed, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const newTaskId = generateId(); // Backend generates ID
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Tasks (id, title, description, dueDate, relatedDealId, relatedContactId, completed, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      now
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
    };

    return NextResponse.json(newTask, { status: 201 });

  } catch (error) {
    console.error('API Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task.' }, { status: 500 });
  }
}
