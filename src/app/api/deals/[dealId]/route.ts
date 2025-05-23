
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Deal } from '@/lib/types';

// GET a single deal by ID
export async function GET(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtDeal = db.prepare(`
      SELECT d.*, 
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
              FROM Notes n WHERE n.dealId = d.id ORDER BY n.createdAt DESC) as notes_json
      FROM Deals d 
      WHERE d.id = ?
    `);
    const dealData = stmtDeal.get(dealId) as any;

    if (!dealData) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deal: Deal = {
      ...dealData,
      tags: dealData.tags ? JSON.parse(dealData.tags) : [],
      notes: dealData.notes_json ? JSON.parse(dealData.notes_json) : [],
    };
    
    return NextResponse.json(deal);
  } catch (error) {
    console.error(`API Error fetching deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch deal.' }, { status: 500 });
  }
}

// PUT (update) an existing deal
export async function PUT(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }
    const body = await request.json();
    const { name, value, stage, contactId, companyId, expectedCloseDate, tags, description } = body;

    if (!name || value === undefined || !stage) {
      return NextResponse.json({ error: 'Deal name, value, and stage are required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const stmt = db.prepare(
      `UPDATE Deals 
       SET name = ?, value = ?, stage = ?, contactId = ?, companyId = ?, 
           expectedCloseDate = ?, tags = ?, description = ?, updatedAt = ?
       WHERE id = ?`
    );
    
    const result = stmt.run(
      name,
      value,
      stage,
      contactId || null,
      companyId || null,
      expectedCloseDate || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      dealId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Deal not found or no changes made' }, { status: 404 });
    }
    
    const stmtUpdatedDeal = db.prepare(`
        SELECT d.*, 
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt)) 
                FROM Notes n WHERE n.dealId = d.id ORDER BY n.createdAt DESC) as notes_json
        FROM Deals d 
        WHERE d.id = ?
    `);
    const updatedDealData = stmtUpdatedDeal.get(dealId) as any;
    const updatedDeal: Deal = {
      ...updatedDealData,
      tags: updatedDealData.tags ? JSON.parse(updatedDealData.tags) : [],
      notes: updatedDealData.notes_json ? JSON.parse(updatedDealData.notes_json) : [],
    };

    return NextResponse.json(updatedDeal);

  } catch (error) {
    console.error(`API Error updating deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to update deal.' }, { status: 500 });
  }
}

// DELETE a deal
export async function DELETE(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    // Related notes are set to ON DELETE CASCADE in schema.
    // Need to consider related Tasks (relatedDealId SET NULL).
    
    const stmtUpdateTasks = db.prepare('UPDATE Tasks SET relatedDealId = NULL WHERE relatedDealId = ?');
    stmtUpdateTasks.run(dealId);
    
    const stmtDeleteDeal = db.prepare('DELETE FROM Deals WHERE id = ?');
    const result = stmtDeleteDeal.run(dealId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deal deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting deal ${params.dealId}:`, error);
    return NextResponse.json({ error: 'Failed to delete deal.' }, { status: 500 });
  }
}
