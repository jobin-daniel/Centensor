import { NextResponse } from 'next/server';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  getAccountBookById,
} from '@/lib/db/queries';
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

    const transactions = await getTransactions({
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
    const {
      book_id,
      date,
      amount,
      category_id,
      account_id,
      payment_method,
      type,
      to_account_id,
      description,
      merchant,
      notes,
      income_type,
      income_category,
      repayment_due_date,
      repayment_status,
    } = body;

    if (!book_id || !date || !amount || !account_id || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'book_id, date, amount, account_id, and payment_method are required' },
        { status: 400 }
      );
    }

    // Verify book belongs to this user
    const book = await getAccountBookById(Number(book_id), user!.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Account book not found' }, { status: 404 });
    }

    const tx = await createTransaction({
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
      income_type,
      income_category,
      repayment_due_date,
      repayment_status,
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

    await deleteTransaction(parseInt(id, 10), user!.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const {
      id,
      book_id,
      date,
      amount,
      category_id,
      account_id,
      payment_method,
      type,
      to_account_id,
      description,
      merchant,
      notes,
      income_type,
      income_category,
      repayment_due_date,
      repayment_status,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const existingTx = await getTransactionById(Number(id), user!.id);
    if (!existingTx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    if (book_id && Number(book_id) !== existingTx.book_id) {
      const book = await getAccountBookById(Number(book_id), user!.id);
      if (!book) {
        return NextResponse.json({ success: false, error: 'Account book not found' }, { status: 404 });
      }
    }

    const updated = await updateTransaction(
      Number(id),
      {
        book_id: book_id ? Number(book_id) : undefined,
        date,
        amount: amount !== undefined ? Number(amount) : undefined,
        category_id: category_id !== undefined ? (category_id ? Number(category_id) : null) : undefined,
        account_id: account_id !== undefined ? Number(account_id) : undefined,
        payment_method,
        type,
        to_account_id: to_account_id !== undefined ? (to_account_id ? Number(to_account_id) : null) : undefined,
        description: description !== undefined ? description : undefined,
        merchant: merchant !== undefined ? merchant : undefined,
        notes: notes !== undefined ? notes : undefined,
        income_type,
        income_category,
        repayment_due_date,
        repayment_status,
      },
      user!.id
    );

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export const PATCH = PUT;
