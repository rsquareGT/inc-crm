
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log("API Logout: POST request received");
    
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear the session cookie by setting its expiry date to the past
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    console.log("API Logout: Session cookie cleared via NextResponse");

    return response;
  } catch (error) {
    console.error('API Logout Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
