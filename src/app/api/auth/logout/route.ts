
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies from next/headers

export async function POST() {
  try {
    console.log("API Logout: POST request received");
    
    // Use cookies() from next/headers to clear the cookie
    const cookieStore = await cookies();
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Set expiry to the past
    });
    console.log("API Logout: Session cookie cleared via next/headers cookies().set");

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('API Logout Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
