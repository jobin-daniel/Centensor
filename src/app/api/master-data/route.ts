import { NextResponse } from 'next/server';
import {
  getInstitutions,
  createInstitution,
  getAccounts,
  createAccount,
  getCurrencies,
  getMasterCurrency,
  updateCurrencyRate,
  setMasterCurrency,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId') ? parseInt(searchParams.get('bookId')!, 10) : undefined;

    const institutions = getInstitutions();
    const accounts = getAccounts(bookId);
    const currencies = getCurrencies();
    const masterCurrency = getMasterCurrency();

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
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'create_institution') {
      const inst = createInstitution(payload);
      return NextResponse.json({ success: true, data: inst });
    } else if (action === 'create_account') {
      const acc = createAccount(payload);
      return NextResponse.json({ success: true, data: acc });
    } else if (action === 'update_currency_rate') {
      updateCurrencyRate(payload.code, payload.rate);
      return NextResponse.json({ success: true });
    } else if (action === 'set_master_currency') {
      setMasterCurrency(payload.code);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
