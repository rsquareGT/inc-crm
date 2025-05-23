
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Deal } from '@/lib/types';
import { generateId } from '@/lib/mock-data'; // For generating IDs for new entities

// GET all deals
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const contactId = searchParams.get('contactId');

    let query = `
      SELECT d.*, 
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
              FROM Notes n WHERE n.dealId = d.id ORDER BY n.createdAt DESC) as notes_json
      FROM Deals d
    `;
    const params: any[] = [];

    if (companyId) {
      query += ' WHERE d.companyId = ?';
      params.push(companyId);
    } else if (contactId) {
      query += ' WHERE d.contactId = ?';
      params.push(contactId);
    }
    
    query += ' ORDER BY d.name ASC';

    const stmtDeals = db.prepare(query);
    const dealsData = stmtDeals.all(...params) as any[];

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
    const { name, value, stage, contactId, companyId, expectedCloseDate, tags, description } = body;

    if (!name || !value || !stage) {
      return NextResponse.json({ error: 'Deal name, value, and stage are required' }, { status: 400 });
    }

    const newDealId = generateId(); // Backend generates ID
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO Deals (id, name, value, stage, contactId, companyId, expectedCloseDate, tags, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      now
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
      notes: [], // New deal starts with no notes via this endpoint
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(newDeal, { status: 201 });

  } catch (error) {
    console.error('API Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal.' }, { status: 500 });
  }
}
