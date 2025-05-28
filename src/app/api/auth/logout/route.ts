import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import type { RefreshToken } from "@/lib/types";

const ACCESS_TOKEN_NAME = "access_token";
const REFRESH_TOKEN_NAME = "refresh_token";

export async function POST(request: NextRequest) {
  console.log("API Logout: POST request received");
  try {
    const cookieStore = await cookies(); // Use await as per latest guidance
    const refreshTokenValue = cookieStore.get(REFRESH_TOKEN_NAME)?.value;

    if (refreshTokenValue && db) {
      // Attempt to find and delete the refresh token from the DB
      // This is more robust if you have multiple refresh tokens per user or want to invalidate a specific one.
      // As with refresh-token, direct lookup by raw token is hard. Iterate for now.
      const stmtGetAllTokens = db.prepare("SELECT * FROM RefreshTokens");
      const allDbTokens = stmtGetAllTokens.all() as RefreshToken[];
      let dbTokenRecordId: string | undefined;

      for (const tokenRec of allDbTokens) {
        const match = await bcrypt.compare(refreshTokenValue, tokenRec.tokenHash);
        if (match) {
          dbTokenRecordId = tokenRec.id;
          break;
        }
      }
      if (dbTokenRecordId) {
        db.prepare("DELETE FROM RefreshTokens WHERE id = ?").run(dbTokenRecordId);
        console.log(`API Logout: Refresh token with ID ${dbTokenRecordId} deleted from DB.`);
      } else {
        console.warn(
          "API Logout: Refresh token from cookie not found in DB or hash mismatch. No DB record deleted."
        );
      }
    } else if (refreshTokenValue && !db) {
      console.warn(
        "API Logout: Refresh token present but DB connection unavailable. Cannot delete from DB."
      );
    }

    const response = NextResponse.json({ success: true, message: "Logged out successfully" });

    // Clear access_token cookie
    cookieStore.set(ACCESS_TOKEN_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0), // Set expiry to the past
    });
    console.log("API Logout: access_token cookie cleared.");

    // Clear refresh_token cookie
    cookieStore.set(REFRESH_TOKEN_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh-token", // Path must match where it was set
      expires: new Date(0), // Set expiry to the past
    });
    console.log("API Logout: refresh_token cookie cleared.");

    // Remove old 'session' cookie if it exists
    if (cookieStore.has("session")) {
      console.log("API Logout: Old 'session' cookie found, deleting it.");
      cookieStore.delete("session", { path: "/", expires: new Date(0) });
    }

    return response;
  } catch (error) {
    console.error("API Logout Error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred during logout." },
      { status: 500 }
    );
  }
}
