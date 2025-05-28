import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { User, UserRole } from "@/lib/types";
import { generateId } from "@/lib/utils";
import bcrypt from "bcrypt";
import * as jose from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get admin details from JWT (could be moved to a shared util)
async function getAdminFromRequest(
  request: NextRequest
): Promise<{ id: string; organizationId: string; role: UserRole; email: string } | null> {
  if (!JWT_SECRET) {
    console.error("API Users: JWT_SECRET not configured.");
    return null;
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("access_token")?.value;
  if (!sessionToken) {
    console.warn("API Users: No session token found for admin check.");
    return null;
  }
  try {
    const { payload } = await jose.jwtVerify(sessionToken, new TextEncoder().encode(JWT_SECRET));
    if (payload.role !== "admin" || !payload.sub || !payload.organizationId || !payload.email) {
      console.warn("API Users: User is not an admin or token payload is invalid.");
      return null;
    }
    return {
      id: payload.sub as string,
      organizationId: payload.organizationId as string,
      role: payload.role as UserRole,
      email: payload.email as string,
    };
  } catch (error) {
    console.error("API Users: Error verifying admin token:", error);
    return null;
  }
}

// GET all users (for admin's organization)
export async function GET(request: NextRequest) {
  console.log("API GET /api/users - Request received");
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      console.warn("API GET /api/users: Unauthorized admin access attempt.");
      return NextResponse.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
    }
    console.log(
      `API GET /api/users: Admin ${admin.email} (Org: ${admin.organizationId}) fetching users.`
    );

    if (!db) {
      console.error("API GET /api/users: Database connection is not available");
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }

    // Changed to single-line standard string
    const stmtUsers = db.prepare(
      "SELECT id, organizationId, email, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt FROM Users WHERE organizationId = ? ORDER BY lastName ASC, firstName ASC"
    );

    const usersData = stmtUsers.all(admin.organizationId) as User[];
    console.log(
      `API GET /api/users: Found ${usersData.length} users for organization ${admin.organizationId}.`
    );

    return NextResponse.json(usersData);
  } catch (error) {
    console.error("API GET /api/users: Error fetching users:", error);
    let errorMessage = "Failed to fetch users.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST a new user (admin only)
export async function POST(request: NextRequest) {
  console.log("API POST /api/users - Request received");
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      console.warn("API POST /api/users: Unauthorized admin access attempt to create user.");
      return NextResponse.json(
        { error: "Unauthorized: Admin access required to create users." },
        { status: 403 }
      );
    }
    console.log(
      `API POST /api/users: Admin ${admin.email} (Org: ${admin.organizationId}) attempting to create user.`
    );

    if (!db) {
      console.error("API POST /api/users: Database connection is not available");
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }
    const body = await request.json();
    console.log("API POST /api/users - Request body:", body);
    const { email, password, firstName, lastName, role, profilePictureUrl } = body;

    if (!email || !password || !firstName || !lastName || !role) {
      console.warn("API POST /api/users: Missing required fields for user creation.");
      return NextResponse.json(
        { error: "Email, password, first name, last name, and role are required" },
        { status: 400 }
      );
    }
    if (role !== "admin" && role !== "user") {
      console.warn(`API POST /api/users: Invalid role specified: ${role}.`);
      return NextResponse.json(
        { error: 'Invalid role specified. Must be "admin" or "user".' },
        { status: 400 }
      );
    }

    const saltRounds = 10;
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log(`API POST /api/users: Password hashed successfully for email: ${email}`);
    } catch (hashError) {
      console.error("API POST /api/users: Error hashing password:", hashError);
      return NextResponse.json({ error: "Error processing user password." }, { status: 500 });
    }

    const newUserId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Users (id, organizationId, email, hashedPassword, firstName, lastName, profilePictureUrl, role, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      newUserId,
      admin.organizationId, // New user belongs to the admin's organization
      email,
      hashedPassword,
      firstName,
      lastName,
      profilePictureUrl || null,
      role,
      1, // isActive defaults to true
      now,
      now
    );
    console.log(
      `API POST /api/users: User ${email} created successfully with ID ${newUserId} in organization ${admin.organizationId}.`
    );

    const newUser: Omit<User, "hashedPassword"> = {
      id: newUserId,
      organizationId: admin.organizationId,
      email,
      firstName,
      lastName,
      profilePictureUrl: profilePictureUrl || undefined,
      role: role as UserRole,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/users: Error creating user:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE" && error.message.includes("Users.email")) {
      console.warn(
        `API POST /api/users: Attempt to create user with existing email: ${error.message}`
      );
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
    let errorMessage = "Failed to create user.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
