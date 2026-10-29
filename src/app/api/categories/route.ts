import { NextResponse } from 'next/server';
import {
  getCategories,
  getCategoryHeads,
  createCategoryHead,
  updateCategoryHead,
  deleteCategoryHead,
  createCategory,
  updateCategory,
  deleteCategory,
  resetCategoriesToDefault,
  setCategoryBudget,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;
    const month = searchParams.get('month') || undefined;

    const categories = await getCategories(bookId, month, user!.id);
    const heads = await getCategoryHeads(user!.id);

    return NextResponse.json({ success: true, categories, heads });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action } = body;

    // Reset all heads and subheads to the recommended taxonomy for this user
    if (action === 'reset_defaults') {
      await resetCategoriesToDefault(user!.id);
      return NextResponse.json({
        success: true,
        message: 'Successfully reset categories to recommended template',
        heads: await getCategoryHeads(user!.id),
        categories: await getCategories(undefined, undefined, user!.id),
      });
    }

    // Set budget for category
    if (action === 'budget') {
      const { bookId, categoryId, month, amount } = body;
      if (!bookId || !categoryId || !month) {
        return NextResponse.json(
          { success: false, error: 'bookId, categoryId, and month are required' },
          { status: 400 }
        );
      }
      await setCategoryBudget(bookId, categoryId, month, Number(amount) || 0);
      return NextResponse.json({ success: true });
    }

    // Create a new Main Head
    if (action === 'create_head') {
      const { name, icon, color, sort_order } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Main Head name is required' }, { status: 400 });
      }
      const head = await createCategoryHead({
        user_id: user!.id,
        name,
        icon,
        color,
        sort_order: sort_order ? Number(sort_order) : undefined,
      });
      return NextResponse.json({ success: true, head });
    }

    // Create a new Sub Head (Category)
    const { head_id, name, group_name, icon, color, sort_order, monthly_budget } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Sub Head name is required' }, { status: 400 });
    }

    const category = await createCategory({
      user_id: user!.id,
      head_id: head_id ? Number(head_id) : null,
      name,
      group_name,
      icon,
      color,
      sort_order: sort_order ? Number(sort_order) : undefined,
      monthly_budget: monthly_budget ? Number(monthly_budget) : undefined,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    // Update Main Head
    if (action === 'update_head') {
      const { name, icon, color, sort_order } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Main Head name is required' }, { status: 400 });
      }
      const head = await updateCategoryHead(Number(id), {
        name,
        icon,
        color,
        sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      });
      return NextResponse.json({ success: true, head });
    }

    // Update Sub Head (Category)
    const { head_id, name, group_name, icon, color, sort_order } = body;
    const category = await updateCategory(Number(id), {
      head_id: head_id !== undefined ? (head_id ? Number(head_id) : null) : undefined,
      name,
      group_name,
      icon,
      color,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'subhead'; // 'head' or 'subhead'
    const cascade = searchParams.get('cascade') === 'true';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (type === 'head') {
      await deleteCategoryHead(parseInt(id, 10), cascade);
      return NextResponse.json({ success: true, message: 'Main Head deleted successfully' });
    } else {
      const res = await deleteCategory(parseInt(id, 10));
      return NextResponse.json({
        success: true,
        message: 'Sub Head deleted successfully',
        transactionsCount: res.transactionsCount,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
