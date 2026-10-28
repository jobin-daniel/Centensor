import { NextResponse } from 'next/server';
import {
  getIncomeTypes,
  createIncomeType,
  updateIncomeType,
  deleteIncomeType,
  resetIncomeTypes,
  addIncomeSubcategory,
  removeIncomeSubcategory,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET() {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const incomeTypes = getIncomeTypes(user!.id);
    return NextResponse.json({ success: true, incomeTypes });
  } catch (error) {
    console.error('Error fetching income types:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      const resetList = resetIncomeTypes(user!.id);
      return NextResponse.json({ success: true, incomeTypes: resetList });
    }

    if (action === 'add_subcategory') {
      const { id, subcategory } = body;
      if (!id || !subcategory) {
        return NextResponse.json({ success: false, error: 'id and subcategory are required' }, { status: 400 });
      }
      const updated = addIncomeSubcategory(Number(id), String(subcategory), user!.id);
      return NextResponse.json({ success: true, incomeType: updated });
    }

    if (action === 'remove_subcategory') {
      const { id, subcategory } = body;
      if (!id || !subcategory) {
        return NextResponse.json({ success: false, error: 'id and subcategory are required' }, { status: 400 });
      }
      const updated = removeIncomeSubcategory(Number(id), String(subcategory), user!.id);
      return NextResponse.json({ success: true, incomeType: updated });
    }

    // Create new income type
    const {
      type,
      label,
      shortLabel,
      icon,
      color,
      description,
      payerLabel,
      payerPlaceholder,
      descriptionPlaceholder,
      defaultCategories,
      sort_order,
      is_active,
    } = body;

    if (!type || !label || !shortLabel) {
      return NextResponse.json(
        { success: false, error: 'type, label, and shortLabel are required' },
        { status: 400 }
      );
    }

    const created = createIncomeType({
      user_id: user!.id,
      type,
      label,
      shortLabel,
      icon: icon || '💰',
      color: color || '#10b981',
      description,
      payerLabel,
      payerPlaceholder,
      descriptionPlaceholder,
      defaultCategories: Array.isArray(defaultCategories) ? defaultCategories : [],
      sort_order,
      is_active,
    });

    return NextResponse.json({ success: true, incomeType: created });
  } catch (error) {
    console.error('Error creating income type:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Income type ID is required' }, { status: 400 });
    }

    const updated = updateIncomeType(Number(id), updateFields, user!.id);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Income type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, incomeType: updated });
  } catch (error) {
    console.error('Error updating income type:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Income type ID is required' }, { status: 400 });
    }

    const deleted = deleteIncomeType(parseInt(id, 10), user!.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Income type not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income type:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
