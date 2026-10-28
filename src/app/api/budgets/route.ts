import { NextResponse } from 'next/server';
import {
  getMonthlyBudgetData,
  setCategoryBudget,
  setMultipleCategoryBudgets,
  copyBudgetsFromMonth,
  clearMonthBudgets,
  applySmartBudgetRule,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const bookId = parseInt(searchParams.get('bookId') || '1', 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const budgetData = getMonthlyBudgetData(bookId, year, month, user!.id);
    return NextResponse.json({ success: true, data: budgetData });
  } catch (error) {
    console.error('Error fetching monthly budget data:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action } = body;

    // 1. Set single category budget
    if (action === 'set_single' || action === 'set') {
      const { bookId, month, categoryId, amount } = body;
      if (!bookId || !month || !categoryId) {
        return NextResponse.json(
          { success: false, error: 'bookId, month, and categoryId are required' },
          { status: 400 }
        );
      }
      setCategoryBudget(Number(bookId), Number(categoryId), String(month), Math.max(0, Number(amount) || 0));
      return NextResponse.json({ success: true, message: 'Budget updated successfully' });
    }

    // 2. Set multiple category budgets in batch
    if (action === 'set_multiple') {
      const { bookId, month, budgets } = body;
      if (!bookId || !month || !Array.isArray(budgets)) {
        return NextResponse.json(
          { success: false, error: 'bookId, month, and budgets array are required' },
          { status: 400 }
        );
      }
      setMultipleCategoryBudgets(Number(bookId), String(month), budgets);
      return NextResponse.json({ success: true, count: budgets.length });
    }

    // 3. Copy budgets from previous month (or specified source month)
    if (action === 'copy_previous' || action === 'copy_month') {
      const { bookId, targetMonth, sourceMonth } = body;
      if (!bookId || !targetMonth || !sourceMonth) {
        return NextResponse.json(
          { success: false, error: 'bookId, targetMonth, and sourceMonth are required' },
          { status: 400 }
        );
      }
      const res = copyBudgetsFromMonth(Number(bookId), String(sourceMonth), String(targetMonth));
      return NextResponse.json({
        success: true,
        message: `Successfully copied ${res.copiedCount} budgets from ${sourceMonth}`,
        copiedCount: res.copiedCount,
      });
    }

    // 4. Smart auto-budgeting rules (e.g. 3-month avg, previous actual, +5%, etc.)
    if (action === 'smart_fill') {
      const { bookId, targetMonth, rule } = body;
      if (!bookId || !targetMonth || !rule) {
        return NextResponse.json(
          { success: false, error: 'bookId, targetMonth, and rule are required' },
          { status: 400 }
        );
      }
      const res = applySmartBudgetRule(Number(bookId), String(targetMonth), rule, user!.id);
      return NextResponse.json({
        success: true,
        message: `Successfully applied smart budget rule "${rule}" to ${res.updatedCount} categories`,
        updatedCount: res.updatedCount,
      });
    }

    // 5. Clear month budgets
    if (action === 'clear_month') {
      const { bookId, month } = body;
      if (!bookId || !month) {
        return NextResponse.json(
          { success: false, error: 'bookId and month are required' },
          { status: 400 }
        );
      }
      clearMonthBudgets(Number(bookId), String(month));
      return NextResponse.json({ success: true, message: `Cleared all budgets for ${month}` });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error processing budget action:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
