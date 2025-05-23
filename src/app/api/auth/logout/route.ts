
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the session cookie
    cookies().set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Set expiry date to the past
    });

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('API Logout Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
