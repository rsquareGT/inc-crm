
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Deal } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // For generating IDs

// GET all deals
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const contactId = searchParams.get('contactId');
    // TODO: Add organizationId filtering based on authenticated user

    let query = `
      SELECT d.*, 
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId)) 
              FROM Notes n WHERE n.dealId = d.id ORDER BY n.createdAt DESC) as notes_json
      FROM Deals d
    `;
    const queryParams: any[] = [];

    let whereClauseAdded = false;
    const addWhereOrAnd = () => {
        if (whereClauseAdded) return ' AND';
        whereClauseAdded = true;
        return ' WHERE';
    }

    if (companyId) {
      query += `${addWhereOrAnd()} d.companyId = ?`;
      queryParams.push(companyId);
    }
    if (contactId) { // Changed from else if to allow multiple filters if needed, though UI currently uses one
      query += `${addWhereOrAnd()} d.contactId = ?`;
      queryParams.push(contactId);
    }
    // TODO: Add organizationId to WHERE clause
    // if (organizationId) {
    //   query += `${addWhereOrAnd()} d.organizationId = ?`;
    //   queryParams.push(organizationId);
    // }
    
    query += ' ORDER BY d.name ASC';

    const stmtDeals = db.prepare(query);
    const dealsData = stmtDeals.all(...queryParams) as any[];

    const deals: Deal[] = dealsData.map((deal) => ({
      ...deal,
      tags: deal.tags ? JSON.parse(deal.tags) : [],
      notes: deal.notes_json ? JSON.parse(deal.notes_json) : [],
    }));
    
    return NextResponse.json(deals);
  } catch (error) {
    console.error('API Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals.' }, { status: 500 });
  }
}

// POST a new deal
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, value, stage, contactId, companyId, expectedCloseDate, tags, description, organizationId } = body; // Assuming organizationId is passed

    if (!name || value === undefined || !stage) { // Ensure value is checked for undefined explicitly
      return NextResponse.json({ error: 'Deal name, value, and stage are required' }, { status: 400 });
    }
     // TODO: In a real multi-tenant app, organizationId should come from authenticated user's session or context
    if (!organizationId) {
        return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }


    const newDealId = generateId(); // Backend generates ID
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Deals (id, name, value, stage, contactId, companyId, expectedCloseDate, tags, description, createdAt, updatedAt, organizationId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    stmt.run(
      newDealId,
      name,
      value,
      stage,
      contactId || null,
      companyId || null,
      expectedCloseDate || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      now,
      organizationId
    );

    const newDeal: Deal = {
      id: newDealId,
      name,
      value,
      stage,
      contactId,
      companyId,
      expectedCloseDate,
      tags: tags || [],
      description,
      notes: [], 
      createdAt: now,
      updatedAt: now,
      organizationId,
    };

    return NextResponse.json(newDeal, { status: 201 });

  } catch (error) {
    console.error('API Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal.' }, { status: 500 });
  }
}
