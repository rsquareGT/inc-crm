
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  console.log("API Change Password: POST request received");
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.warn('API Change Password: User ID not found in session headers.');
      return NextResponse.json({ error: 'Unauthorized. User session not found.' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    if (!currentPassword || !newPassword || !confirmPassword) {
      console.warn('API Change Password: Missing required fields.');
      return NextResponse.json({ error: 'Current password, new password, and confirmation are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      console.warn('API Change Password: New passwords do not match.');
      return NextResponse.json({ error: 'New passwords do not match.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      console.warn('API Change Password: New password is too short.');
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }
    
    if (!db) {
      console.error('API Change Password: Database connection is not available');
      return NextResponse.json({ error: 'Database connection error.' }, { status: 500 });
    }

    // Fetch user including their current hashed password
    const stmtUser = db.prepare('SELECT id, hashedPassword FROM Users WHERE id = ?');
    const userData = stmtUser.get(userId) as Pick<User, 'id'> & { hashedPassword?: string } | undefined;

    if (!userData || !userData.hashedPassword) {
      console.warn(`API Change Password: User not found or no hashed password for ID: ${userId}`);
      return NextResponse.json({ error: 'Invalid user or unable to verify current password.' }, { status: 401 });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(currentPassword, userData.hashedPassword);
    } catch (compareError) {
      console.error('API Change Password: bcrypt.compare error:', compareError);
      return NextResponse.json({ error: 'Error during password verification.' }, { status: 500 });
    }

    if (!passwordMatch) {
      console.warn(`API Change Password: Current password incorrect for user ID: ${userId}`);
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 401 });
    }

    console.log(`API Change Password: Current password verified for user ID: ${userId}`);

    const saltRounds = 10;
    let newHashedPassword;
    try {
      newHashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log(`API Change Password: New password hashed successfully for user ID: ${userId}`);
    } catch (hashError) {
      console.error('API Change Password: Error hashing new password:', hashError);
      return NextResponse.json({ error: 'Error processing new password.' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const stmtUpdatePassword = db.prepare('UPDATE Users SET hashedPassword = ?, updatedAt = ? WHERE id = ?');
    const result = stmtUpdatePassword.run(newHashedPassword, now, userId);

    if (result.changes === 0) {
      console.error(`API Change Password: Failed to update password in DB for user ID: ${userId}. No rows affected.`);
      // This case should ideally not happen if the user was fetched correctly.
      return NextResponse.json({ error: 'Failed to update password. User not found or no change needed.' }, { status: 500 });
    }
    
    console.log(`API Change Password: Password updated successfully for user ID: ${userId}`);
    return NextResponse.json({ success: true, message: 'Password updated successfully.' });

  } catch (error) {
    console.error('API Change Password Error:', error);
    if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('SQLITE_')) {
        console.error(`API Change Password: SQLite Error - Code: ${error.code}, Message: ${error.message}`);
        return NextResponse.json({ error: `Database operation failed: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'An internal server error occurred during password change.' }, { status: 500 });
  }
}
