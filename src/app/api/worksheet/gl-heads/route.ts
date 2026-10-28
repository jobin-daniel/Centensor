import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-helper';
import {
  getMonthlyWorksheetGlPreferences,
  saveMonthlyWorksheetGlPreferences,
  addGlHeadToMonth,
  removeGlHeadFromMonth,
  copyPreviousMonthGlPreferences,
  addAllGlHeadsToMonth,
  reorderMonthlyGlHeads,
  moveMonthlyGlHead,
  getCategoryHeads,
  createCategoryHead,
  createCategory,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const bookId = parseInt(searchParams.get('bookId') || '1', 10);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : now.getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : now.getMonth() + 1;
    const monthStr = searchParams.get('monthStr') || `${year}-${String(month).padStart(2, '0')}`;

    const preferences = getMonthlyWorksheetGlPreferences(bookId, monthStr, user!.id);
    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { bookId, monthStr, action } = body;

    if (!bookId || !monthStr) {
      return NextResponse.json({ success: false, error: 'bookId and monthStr are required' }, { status: 400 });
    }

    const bId = Number(bookId);

    // 1. Full save
    if (!action || action === 'save') {
      const { headIds, categoryIds } = body;
      if (!Array.isArray(headIds)) {
        return NextResponse.json({ success: false, error: 'headIds array is required' }, { status: 400 });
      }
      const preferences = saveMonthlyWorksheetGlPreferences({
        bookId: bId,
        monthStr,
        userId: user!.id,
        headIds: headIds.map(Number),
        categoryIds: Array.isArray(categoryIds) ? categoryIds.map(Number) : undefined,
      });
      return NextResponse.json({ success: true, preferences });
    }

    // 2. Add single head
    if (action === 'add_head') {
      const { headId } = body;
      if (!headId) {
        return NextResponse.json({ success: false, error: 'headId is required' }, { status: 400 });
      }
      const preferences = addGlHeadToMonth(bId, monthStr, user!.id, Number(headId));
      return NextResponse.json({ success: true, preferences });
    }

    // 3. Remove single head
    if (action === 'remove_head') {
      let { headId, headName } = body;
      if (!headId && headName) {
        const allHeads = getCategoryHeads(user!.id);
        const found = allHeads.find(
          (h) => h.name.toLowerCase() === String(headName).trim().toLowerCase()
        );
        if (found) headId = found.id;
      }
      if (!headId) {
        return NextResponse.json({ success: false, error: 'headId or headName is required' }, { status: 400 });
      }
      const preferences = removeGlHeadFromMonth(bId, monthStr, user!.id, Number(headId));
      return NextResponse.json({ success: true, preferences });
    }

    // 4. Copy from previous month
    if (action === 'copy_previous') {
      const { sourceMonth } = body;
      const preferences = copyPreviousMonthGlPreferences(bId, monthStr, user!.id, sourceMonth);
      return NextResponse.json({ success: true, preferences });
    }

    // 5. Add all heads
    if (action === 'add_all') {
      const preferences = addAllGlHeadsToMonth(bId, monthStr, user!.id);
      return NextResponse.json({ success: true, preferences });
    }

    // 6. Reorder heads
    if (action === 'reorder') {
      const { headIds } = body;
      if (!Array.isArray(headIds)) {
        return NextResponse.json({ success: false, error: 'headIds array is required' }, { status: 400 });
      }
      const preferences = reorderMonthlyGlHeads(bId, monthStr, user!.id, headIds.map(Number));
      return NextResponse.json({ success: true, preferences });
    }

    // 7. Move single head up or down
    if (action === 'move_head') {
      const { headId, direction } = body;
      if (!headId || !direction || (direction !== 'up' && direction !== 'down')) {
        return NextResponse.json({ success: false, error: 'headId and direction (up/down) are required' }, { status: 400 });
      }
      const preferences = moveMonthlyGlHead(bId, monthStr, user!.id, Number(headId), direction);
      return NextResponse.json({ success: true, preferences });
    }

    // 8. Create brand new GL Head and add to month
    if (action === 'create_and_add_head') {
      const { name, icon, color, subHeadNames } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'GL Head name is required' }, { status: 400 });
      }

      const newHead = createCategoryHead({
        user_id: user!.id,
        name: name.trim(),
        icon: icon || '📁',
        color: color || '#6366F1',
      });

      // If user supplied subhead names, create them under the new head
      const namesToCreate: string[] = [];
      if (Array.isArray(subHeadNames)) {
        namesToCreate.push(...subHeadNames.filter(Boolean));
      } else if (typeof subHeadNames === 'string' && subHeadNames.trim()) {
        namesToCreate.push(...subHeadNames.split(',').map((s) => s.trim()).filter(Boolean));
      }

      if (namesToCreate.length === 0) {
        // Create at least one general subcategory
        namesToCreate.push('General');
      }

      for (const subName of namesToCreate) {
        createCategory({
          user_id: user!.id,
          head_id: newHead.id,
          name: subName,
          group_name: newHead.name,
          icon: newHead.icon,
          color: newHead.color,
        });
      }

      // Add to this month
      const preferences = addGlHeadToMonth(bId, monthStr, user!.id, newHead.id);
      return NextResponse.json({ success: true, preferences, head: newHead });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
