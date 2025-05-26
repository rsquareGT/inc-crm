
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import type { Deal } from '@/lib/types';

// GET a single deal by ID, ensuring it belongs to the user's organization
export async function GET(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    const stmtDeal = db.prepare(`
      SELECT d.*,
             (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
              FROM Notes n WHERE n.dealId = d.id AND n.organizationId = d.organizationId ORDER BY n.createdAt DESC) as notes_json
      FROM Deals d
      WHERE d.id = ? AND d.organizationId = ?
    `);
    const dealData = stmtDeal.get(dealId, organizationId) as any;

    if (!dealData) {
      return NextResponse.json({ error: 'Deal not found or not authorized' }, { status: 404 });
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

// PUT (update) an existing deal, ensuring it belongs to the user's organization
export async function PUT(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

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
       WHERE id = ? AND organizationId = ?` // Ensure update is scoped to organization
    );

    const result = stmt.run(
      name,
      value,
      stage,
      contactId === '_none_' ? null : contactId || null,
      companyId === '_none_' ? null : companyId || null,
      expectedCloseDate || null,
      JSON.stringify(tags || []),
      description || null,
      now,
      dealId,
      organizationId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Deal not found, not authorized, or no changes made' }, { status: 404 });
    }

    const stmtUpdatedDeal = db.prepare(`
        SELECT d.*,
               (SELECT json_group_array(json_object('id', n.id, 'content', n.content, 'createdAt', n.createdAt))
                FROM Notes n WHERE n.dealId = d.id AND n.organizationId = d.organizationId ORDER BY n.createdAt DESC) as notes_json
        FROM Deals d
        WHERE d.id = ? AND d.organizationId = ?
    `);
    const updatedDealData = stmtUpdatedDeal.get(dealId, organizationId) as any;
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

// DELETE a deal, ensuring it belongs to the user's organization
export async function DELETE(request: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = params;
    const organizationId = request.headers.get('x-user-organization-id');
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized: Organization ID missing.' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database connection is not available' }, { status: 500 });
    }

    db.transaction(() => {
      const stmtUpdateTasks = db.prepare('UPDATE Tasks SET relatedDealId = NULL WHERE relatedDealId = ? AND organizationId = ?');
      stmtUpdateTasks.run(dealId, organizationId);

      // Notes are deleted by CASCADE, but ensure deal belongs to org before deleting
      const dealCheckStmt = db.prepare('SELECT id FROM Deals WHERE id = ? AND organizationId = ?');
      const dealExists = dealCheckStmt.get(dealId, organizationId);

      if (!dealExists) {
        const notFoundError = new Error('Deal not found or not authorized');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }

      const stmtDeleteDeal = db.prepare('DELETE FROM Deals WHERE id = ? AND organizationId = ?');
      const result = stmtDeleteDeal.run(dealId, organizationId);

      if (result.changes === 0) {
        // This case should be caught by dealExists check
        const notFoundError = new Error('Deal not found or not authorized');
        (notFoundError as any).statusCode = 404;
        throw notFoundError;
      }
    })();


    return NextResponse.json({ message: 'Deal deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error deleting deal ${params.dealId}:`, error);
    if (error.statusCode === 404) {
        return NextResponse.json({ error: 'Deal not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete deal.' }, { status: 500 });
  }
}
