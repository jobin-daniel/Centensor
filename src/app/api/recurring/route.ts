import { NextResponse } from 'next/server';
import {
  getRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processRecurringTransaction,
  getAccountBookById,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;
    const type = searchParams.get('type') || undefined;

    const recurring = await getRecurringTransactions(user!.id, bookId, type);
    return NextResponse.json({ success: true, recurring });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action, payload, id, postDate } = body;

    if (action === 'process') {
      const targetId = id || payload?.id;
      if (!targetId) {
        return NextResponse.json({ success: false, error: 'Recurring ID is required' }, { status: 400 });
      }
      const result = await processRecurringTransaction(Number(targetId), postDate || payload?.postDate, user!.id);
      return NextResponse.json({ ...result });
    }

    const data = payload || body;
    if (!data.book_id || !data.account_id || !data.name || !data.amount || !data.start_date || !data.frequency) {
      return NextResponse.json(
        { success: false, error: 'book_id, account_id, name, amount, start_date, and frequency are required' },
        { status: 400 }
      );
    }

    const book = await getAccountBookById(Number(data.book_id), user!.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Account book not found' }, { status: 404 });
    }

    const item = await createRecurringTransaction({
      user_id: user!.id,
      book_id: Number(data.book_id),
      account_id: Number(data.account_id),
      category_id: data.category_id ? Number(data.category_id) : null,
      type: data.type || 'income',
      to_account_id: data.to_account_id ? Number(data.to_account_id) : null,
      name: data.name,
      amount: Number(data.amount),
      currency_code: data.currency_code,
      frequency: data.frequency,
      day_of_month: data.day_of_month ? Number(data.day_of_month) : 1,
      day_of_week: data.day_of_week ? Number(data.day_of_week) : 1,
      start_date: data.start_date,
      end_date: data.end_date || null,
      payer_merchant: data.payer_merchant || null,
      description: data.description || null,
      auto_post: data.auto_post ? 1 : 0,
      is_active: data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
    });

    return NextResponse.json({ success: true, recurring: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recurring transaction ID is required' }, { status: 400 });
    }

    const item = await updateRecurringTransaction(Number(id), data, user!.id);
    return NextResponse.json({ success: true, recurring: item });
  } catch (error) {
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
      return NextResponse.json({ success: false, error: 'Recurring transaction ID is required' }, { status: 400 });
    }

    await deleteRecurringTransaction(parseInt(id, 10), user!.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
