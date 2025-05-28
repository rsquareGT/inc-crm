import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Activity } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get("x-user-organization-id");
    if (!organizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Organization ID missing." },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let query = `
      SELECT 
        a.*,
        u.firstName as userFirstName,
        u.lastName as userLastName,
        u.email as userEmail,
        u.profilePictureUrl as userProfilePictureUrl
      FROM Activities a
      JOIN Users u ON a.userId = u.id 
      WHERE a.organizationId = ?
    `;
    const queryParams: any[] = [organizationId];

    if (entityType && entityId) {
      query += " AND a.entityType = ? AND a.entityId = ?";
      queryParams.push(entityType, entityId);
    }

    query += " ORDER BY a.createdAt DESC LIMIT ?";
    queryParams.push(limit > 0 && limit <= 100 ? limit : 20); // Cap limit for safety

    const stmtActivities = db.prepare(query);
    const activitiesData = stmtActivities.all(...queryParams) as any[];

    const activities: Activity[] = activitiesData.map((act) => ({
      id: act.id,
      organizationId: act.organizationId,
      userId: act.userId,
      user: {
        firstName: act.userFirstName,
        lastName: act.userLastName,
        email: act.userEmail,
        profilePictureUrl: act.userProfilePictureUrl,
      },
      activityType: act.activityType,
      entityType: act.entityType,
      entityId: act.entityId,
      entityName: act.entityName,
      details: act.details ? JSON.parse(act.details) : undefined,
      createdAt: act.createdAt,
    }));

    return NextResponse.json(activities);
  } catch (error) {
    console.error("API Error fetching activities:", error);
    let errorMessage = "Failed to fetch activities.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
