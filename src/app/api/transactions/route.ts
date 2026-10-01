import { NextResponse } from 'next/server';
import { getTransactions, createTransaction, deleteTransaction, getAccountBookById } from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const book_id = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;
    const month = searchParams.get('month') || undefined;
    const date = searchParams.get('date') || undefined;
    const category_id = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
    const payment_method = searchParams.get('paymentMethod') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const transactions = getTransactions({
      book_id,
      month,
      date,
      category_id,
      payment_method,
      limit,
      userId: user!.id,
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { book_id, date, amount, category_id, account_id, payment_method, type, to_account_id, description, merchant, notes } = body;

    if (!book_id || !date || !amount || !account_id || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'book_id, date, amount, account_id, and payment_method are required' },
        { status: 400 }
      );
    }

    // Verify book belongs to this user
    const book = getAccountBookById(Number(book_id), user!.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Account book not found' }, { status: 404 });
    }

    const tx = createTransaction({
      book_id: Number(book_id),
      date,
      amount: Number(amount),
      category_id: category_id ? Number(category_id) : null,
      account_id: Number(account_id),
      payment_method,
      type: type || 'expense',
      to_account_id: to_account_id ? Number(to_account_id) : null,
      description,
      merchant,
      notes,
    });

    return NextResponse.json({ success: true, transaction: tx });
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
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    deleteTransaction(parseInt(id, 10), user!.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
