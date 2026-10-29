import { NextResponse } from 'next/server';
import {
  getIncomeDashboardData,
  createTransaction,
  deleteTransaction,
  toggleHandLoanRepayment,
  updateTransaction,
  getAccountBookById,
  getAccounts,
  createRecurringTransaction,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';
import { PaymentMethod } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookId = bookIdParam === 'all' ? 'all' : bookIdParam ? parseInt(bookIdParam, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : null;
    const incomeType = searchParams.get('incomeType') || undefined;
    const repaymentStatus = searchParams.get('repaymentStatus') || undefined;
    const search = searchParams.get('search') || undefined;

    const data = await getIncomeDashboardData({
      bookId,
      year,
      month,
      incomeType,
      repaymentStatus,
      search,
      userId: user!.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching income dashboard data:', error);
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
      account_id,
      payment_method,
      income_type,
      income_category,
      merchant,
      description,
      notes,
      repayment_due_date,
      repayment_status,
      is_recurring,
      recurring_frequency,
    } = body;

    if (!book_id || !date || !amount || !account_id) {
      return NextResponse.json(
        { success: false, error: 'book_id, date, amount, and receiving account_id are required' },
        { status: 400 }
      );
    }

    // Verify book belongs to this user
    const book = await getAccountBookById(Number(book_id), user!.id);
    if (!book) {
      return NextResponse.json({ success: false, error: 'Account book not found' }, { status: 404 });
    }

    // Determine payment method from account if not provided
    let pm: PaymentMethod = payment_method || 'debit_card';
    if (!payment_method) {
      const userAccounts = await getAccounts(Number(book_id), user!.id);
      const acc = userAccounts.find((a) => a.id === Number(account_id));
      if (acc?.type === 'cash') pm = 'cash';
      else if (acc?.type === 'credit_card') pm = 'credit_card';
      else pm = 'debit_card';
    }

    const tx = await createTransaction({
      book_id: Number(book_id),
      date,
      amount: parseFloat(amount),
      account_id: Number(account_id),
      payment_method: pm,
      type: 'income',
      income_type: income_type || 'other',
      income_category: income_category || undefined,
      merchant: merchant || undefined,
      description: description || undefined,
      notes: notes || undefined,
      repayment_due_date: repayment_due_date || undefined,
      repayment_status: repayment_status || (income_type === 'petty_hand_loan' ? 'pending' : undefined),
    });

    // Schedule recurring transaction if requested
    if (is_recurring) {
      try {
        await createRecurringTransaction({
          user_id: user!.id,
          book_id: Number(book_id),
          account_id: Number(account_id),
          type: 'income',
          name: description || merchant || `${income_category || 'Recurring'} Income`,
          amount: parseFloat(amount),
          currency_code: tx.currency_code,
          frequency: recurring_frequency || 'monthly',
          day_of_month: Math.min(new Date(date).getDate() || 1, 28),
          start_date: date,
          payer_merchant: merchant || null,
          description: description || null,
          auto_post: 1,
        });
      } catch (err) {
        console.error('Failed to create recurring schedule for income:', err);
      }
    }

    return NextResponse.json({ success: true, transaction: tx });
  } catch (error) {
    console.error('Error logging income:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { id, action, status, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    if (action === 'toggle_repayment') {
      const updated = await toggleHandLoanRepayment(
        Number(id),
        status === 'repaid' ? 'repaid' : 'pending',
        user!.id
      );
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, transaction: updated });
    }

    // General update
    const updated = await updateTransaction(Number(id), updateFields, user!.id);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error) {
    console.error('Error updating income:', error);
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
    console.error('Error deleting income transaction:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
