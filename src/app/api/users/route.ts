
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { User } from '@/lib/types';

// GET all users (simplified version for dropdowns)
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // For now, fetching all users without organizationId filter for simplicity in dropdowns.
    // In a multi-tenant app, you'd filter by organizationId based on the logged-in user.
    const stmtUsers = db.prepare('SELECT id, firstName, lastName, email FROM Users ORDER BY lastName ASC, firstName ASC');
    const usersData = stmtUsers.all() as any[];

    // Map to User type, ensuring essential fields are present
    const users: Partial<User>[] = usersData.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      // Other fields like role, profilePictureUrl can be added if needed by the client
    }));
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('API Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}
