
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Company, Note } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // Using generateId for new entities

// GET all companies
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtCompanies = db.prepare(`
      SELECT c.*, 
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
              FROM Notes n WHERE n.companyId = c.id ORDER BY n.createdAt DESC) as notes_json
      FROM Companies c 
      ORDER BY c.name ASC
    `);
    const companiesData = stmtCompanies.all() as any[];

    const companies: Company[] = companiesData.map((company) => ({
      ...company,
      tags: company.tags ? JSON.parse(company.tags) : [],
      notes: company.notes_json ? JSON.parse(company.notes_json) : [],
    }));
    
    return NextResponse.json(companies);
  } catch (error) {
    console.error('API Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies.' }, { status: 500 });
  }
}

// POST a new company
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const newCompanyId = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Companies (id, name, industry, website, street, city, state, postalCode, country, contactPhone1, contactPhone2, companySize, accountManagerId, tags, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    stmt.run(
      newCompanyId,
      name,
      industry || null,
      website || null,
      street || null,
      city || null,
      state || null,
      postalCode || null,
      country || null,
      contactPhone1 || null,
      contactPhone2 || null,
      companySize || null,
      accountManagerId || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      now
    );

    // If there's an initial note in description, consider adding it to Notes table as well
    // For simplicity, initial notes from description are not automatically added to the Notes table here.

    const newCompany: Company = {
      id: newCompanyId,
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
      tags: tags || [],
      description,
      notes: [], // New company starts with no chronological notes via this endpoint
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(newCompany, { status: 201 });

  } catch (error) {
    console.error('API Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company.' }, { status: 500 });
  }
}
