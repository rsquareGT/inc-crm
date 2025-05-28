import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Company } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { logActivity } from "@/services/activity-logger";

// GET all companies for the user's organization
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

    const stmtCompanies = db.prepare(`
      SELECT c.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
              FROM Notes n WHERE n.companyId = c.id AND n.organizationId = c.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Companies c
      WHERE c.organizationId = ?
      ORDER BY c.name ASC
    `);
    const companiesData = stmtCompanies.all(organizationId) as any[];

    const companies: Company[] = companiesData.map((company) => ({
      ...company,
      tags: company.tags ? JSON.parse(company.tags) : [],
      notes: company.notes_json ? JSON.parse(company.notes_json) : [],
    }));

    return NextResponse.json(companies);
  } catch (error) {
    console.error("API Error fetching companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies." }, { status: 500 });
  }
}

// POST a new company for the user's organization
export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get("x-user-organization-id");
    const userId = request.headers.get("x-user-id");

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized: Organization or User ID missing." },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database connection is not available" }, { status: 500 });
    }
    const body = await request.json();
    const {
      name,
      industry,
      website,
      street,
      city,
      state,
      postalCode,
      country,
      contactPhone1,
      contactPhone2,
      companySize,
      accountManagerId,
      tags,
      description,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const newCompanyId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Companies (id, name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description, createdAt, updatedAt, organizationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
      newCompanyId,
      name,
      industry === "_none_" ? null : industry || null,
      website || null,
      street || null,
      city || null,
      state || null,
      postalCode || null,
      country || null,
      contactPhone1 || null,
      contactPhone2 || null,
      companySize === "_none_" ? null : companySize || null,
      accountManagerId === "_none_" ? null : accountManagerId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      now,
      organizationId
    );

    const newCompany: Company = {
      id: newCompanyId,
      name,
      industry: industry === "_none_" ? undefined : industry,
      website,
      street,
      city,
      state,
      postalCode,
      country,
      contactPhone1,
      contactPhone2,
      companySize: companySize === "_none_" ? undefined : companySize,
      accountManagerId: accountManagerId === "_none_" ? undefined : accountManagerId,
      tags: tags || [],
      description,
      notes: [],
      createdAt: now,
      updatedAt: now,
      organizationId,
    };

    // Log activity
    await logActivity({
      organizationId,
      userId,
      activityType: "created_company",
      entityType: "company",
      entityId: newCompanyId,
      entityName: name,
    });

    return NextResponse.json(newCompany, { status: 201 });
  } catch (error) {
    console.error("API Error creating company:", error);
    return NextResponse.json({ error: "Failed to create company." }, { status: 500 });
  }
}
