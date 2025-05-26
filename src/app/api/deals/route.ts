
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Deal } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logActivity } from '@/services/activity-logger';

// GET all deals for the user's organization, with optional filters
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const contactId = searchParams.get('contactId');

    let query = `
      SELECT d.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt, 'organizationId', n.organizationId, 'companyId', n.companyId, 'contactId', n.contactId, 'dealId', n.dealId))
              FROM Notes n WHERE n.dealId = d.id AND n.organizationId = d.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Deals d
      WHERE d.organizationId = ?
    `;
    const queryParams: any[] = [organizationId];

    if (companyId) {
      query += ' AND d.companyId = ?';
      queryParams.push(companyId);
    }
    if (contactId) {
      query += ' AND d.contactId = ?';
      queryParams.push(contactId);
    }

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

// POST a new deal for the user's organization
export async function POST(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-user-organization-id');
    const userId = request.headers.get('x-user-id');

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Unauthorized: Organization or User ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, value, stage, contactId, companyId, expectedCloseDate, tags, description } = body;

    if (!name || value === undefined || !stage) {
      return NextResponse.json({ error: 'Deal name, value, and stage are required' }, { status: 400 });
    }

    const newDealId = generateId();
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
      contactId === '_none_' ? null : contactId || null,
      companyId === '_none_' ? null : companyId || null,
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
      contactId: contactId === '_none_' ? undefined : contactId,
      companyId: companyId === '_none_' ? undefined : companyId,
      expectedCloseDate,
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
      activityType: 'created_deal',
      entityType: 'deal',
      entityId: newDealId,
      entityName: name,
    });

    return NextResponse.json(newDeal, { status: 201 });

  } catch (error) {
    console.error('API Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal.' }, { status: 500 });
  }
}
