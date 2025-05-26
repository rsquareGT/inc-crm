
'use server';

import { db } from '@/lib/db';
import { generateId } from '@/lib/utils';
import type { ActivityType, ActivityEntityType } from '@/lib/types';

interface LogActivityInput {
  organizationId: string;
  userId: string;
  activityType: ActivityType;
  entityType: ActivityEntityType;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  if (!db) {
    console.error('ActivityLogger: Database connection is not available. Activity not logged.');
    return;
  }
  if (!input.userId || !input.organizationId) {
    console.error('ActivityLogger: userId and organizationId are required. Activity not logged.');
    return;
  }

  const activityId = generateId();
  const createdAt = new Date().toISOString();

  try {
    const stmt = db.prepare(
      `INSERT INTO Activities (id, organizationId, userId, activityType, entityType, entityId, entityName, details, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      activityId,
      input.organizationId,
      input.userId,
      input.activityType,
      input.entityType,
      input.entityId,
      input.entityName || null,
      input.details ? JSON.stringify(input.details) : null,
      createdAt
    );
    console.log(`Activity logged: ${input.activityType} for ${input.entityType} ${input.entityId} by user ${input.userId}`);
  } catch (error) {
    console.error('ActivityLogger: Error logging activity:', error);
    // Depending on requirements, you might want to re-throw or handle more gracefully
  }
}
