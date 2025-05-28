import { NextResponse, type NextRequest } from "next/server";
import * as jose from "jose";
import { db } from "@/lib/db";
import type { User } from "@/lib/types";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  console.log("API /me: GET request received");
  if (!JWT_SECRET) {
    console.error("API /me: JWT_SECRET is not configured on the server.");
    return NextResponse.json(
      { error: "Server configuration error for authentication." },
      { status: 500 }
    );
  }

  if (!db) {
    console.error("API /me: Database connection is not available.");
    return NextResponse.json({ error: "Database connection error." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("access_token")?.value;

  if (!sessionToken) {
    console.log("API /me: No session token found in cookies.");
    return NextResponse.json({ error: "Not authenticated. No session token." }, { status: 401 });
  }
  console.log("API /me: Session token found.");

  try {
    const { payload } = await jose.jwtVerify(sessionToken, new TextEncoder().encode(JWT_SECRET));
    console.log("API /me: JWT verified successfully. Payload sub:", payload.sub);

    const userId = payload.sub;

    if (!userId || typeof userId !== "string") {
      console.warn("API /me: Invalid token payload - missing or invalid userId.");
      return NextResponse.json({ error: "Invalid token payload." }, { status: 401 });
    }

    const stmtUser = db.prepare(
      "SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM Users WHERE id = ?"
    );
    const user = stmtUser.get(userId) as User | undefined;

    if (!user) {
      console.warn(`API /me: User not found in DB for ID: ${userId}`);
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }
    console.log(`API /me: User ${user.email} fetched successfully from DB.`);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("API /me: JWT Verification or DB Error:", error);
    if (error instanceof jose.errors.JWTExpired) {
      console.warn("API /me: JWT Expired.");
      return NextResponse.json({ error: "Session expired." }, { status: 401 });
    }
    if (error instanceof jose.errors.JOSEError) {
      console.warn(
        `API /me: JWT Invalid (e.g., signature mismatch, malformed). Code: ${error.code}, Message: ${error.message}`
      );
      return NextResponse.json(
        { error: `Invalid session. Details: ${error.message}` },
        { status: 401 }
      );
    }
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("SQLITE_")
    ) {
      console.error(`API /me: SQLite Error - Code: ${error.code}, Message: ${error.message}`);
      return NextResponse.json(
        { error: `Database operation failed during user fetch: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Authentication failed due to server error during token processing or user fetch." },
      { status: 500 }
    );
  }
}
