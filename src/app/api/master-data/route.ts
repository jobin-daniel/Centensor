import { NextResponse } from 'next/server';
import {
  getInstitutions,
  createInstitution,
  getAccounts,
  createAccount,
  getAccountById,
  updateAccount,
  deleteAccount,
  getCurrencies,
  getMasterCurrency,
  updateCurrencyRate,
  setMasterCurrency,
  updateAccountBook,
  deleteAccountBook,
} from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;
    const accountId = searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!, 10) : undefined;

    if (accountId) {
      const account = await getAccountById(accountId, user!.id);
      return NextResponse.json({ success: true, account });
    }

    const institutions = await getInstitutions();
    const accounts = await getAccounts(bookId, user!.id);
    const currencies = await getCurrencies();
    const masterCurrency = await getMasterCurrency();

    return NextResponse.json({
      success: true,
      data: {
        institutions,
        accounts,
        currencies,
        masterCurrency,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action, payload } = body;

    if (action === 'create_institution') {
      const inst = await createInstitution(payload);
      return NextResponse.json({ success: true, data: inst });
    } else if (action === 'create_account') {
      const acc = await createAccount(payload);
      return NextResponse.json({ success: true, data: acc });
    } else if (action === 'update_account') {
      const acc = await updateAccount(payload.id, payload, user!.id);
      return NextResponse.json({ success: true, data: acc });
    } else if (action === 'delete_account') {
      const res = await deleteAccount(payload.id, user!.id);
      return NextResponse.json({ success: true, data: res });
    } else if (action === 'update_currency_rate') {
      await updateCurrencyRate(payload.code, payload.rate);
      return NextResponse.json({ success: true });
    } else if (action === 'set_master_currency') {
      await setMasterCurrency(payload.code);
      return NextResponse.json({ success: true });
    } else if (action === 'update_account_book') {
      const book = await updateAccountBook(payload.id, payload, user!.id);
      return NextResponse.json({ success: true, data: book });
    } else if (action === 'delete_account_book') {
      const res = await deleteAccountBook(payload.id, user!.id);
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const acc = await updateAccount(Number(id), data, user!.id);
    return NextResponse.json({ success: true, data: acc });
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
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const res = await deleteAccount(parseInt(id, 10), user!.id);
    return NextResponse.json({ success: true, data: res });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

