
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Company } from '@/lib/types';

export async function GET() {
  try {
    if (!db) {
      console.error('API Error: Database connection is not available');
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmt = db.prepare('SELECT * FROM Companies ORDER BY name ASC');
    const companiesData = stmt.all() as any[]; // Cast to any[] initially

    const companies: Company[] = companiesData.map((company) => ({
      id: company.id,
      name: company.name,
      industry: company.industry,
      website: company.website,
      street: company.street,
      city: company.city,
      state: company.state,
      postalCode: company.postalCode,
      country: company.country,
      contactPhone1: company.contactPhone1,
      contactPhone2: company.contactPhone2,
      companySize: company.companySize,
      accountManagerId: company.accountManagerId,
      description: company.description,
      tags: company.tags ? JSON.parse(company.tags) : [],
      notes: [], // Notes will be fetched on the company details page or with a more complex query
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));

    return NextResponse.json(companies);
  } catch (error) {
    console.error('API Error fetching companies:', error);
    let errorMessage = 'Failed to fetch companies.';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST, PUT, DELETE handlers will be added in subsequent steps
