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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;
    const month = searchParams.get('month') || undefined;

    const categories = getCategories(bookId, month);
    const heads = getCategoryHeads();

    return NextResponse.json({ success: true, categories, heads });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Reset all heads and subheads to the recommended taxonomy
    if (action === 'reset_defaults') {
      resetCategoriesToDefault();
      return NextResponse.json({
        success: true,
        message: 'Successfully reset categories to recommended template',
        heads: getCategoryHeads(),
        categories: getCategories(),
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
      setCategoryBudget(bookId, categoryId, month, Number(amount) || 0);
      return NextResponse.json({ success: true });
    }

    // Create a new Main Head
    if (action === 'create_head') {
      const { name, icon, color, sort_order } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Main Head name is required' }, { status: 400 });
      }
      const head = createCategoryHead({
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

    const category = createCategory({
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
      const head = updateCategoryHead(Number(id), {
        name,
        icon,
        color,
        sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      });
      return NextResponse.json({ success: true, head });
    }

    // Update Sub Head (Category)
    const { head_id, name, group_name, icon, color, sort_order } = body;
    const category = updateCategory(Number(id), {
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'subhead'; // 'head' or 'subhead'
    const cascade = searchParams.get('cascade') === 'true';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (type === 'head') {
      deleteCategoryHead(parseInt(id, 10), cascade);
      return NextResponse.json({ success: true, message: 'Main Head deleted successfully' });
    } else {
      const res = deleteCategory(parseInt(id, 10));
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
