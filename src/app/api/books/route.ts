import { NextResponse } from 'next/server';
import { getAccountBooks, createAccountBook } from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET() {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const books = getAccountBooks(user!.id);
    return NextResponse.json({ success: true, books });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    if (!body.name || !body.currency_code) {
      return NextResponse.json({ success: false, error: 'Name and currency code are required' }, { status: 400 });
    }

    const newBook = createAccountBook({
      user_id: user!.id,
      name: body.name,
      currency_code: body.currency_code,
      description: body.description,
    });

    return NextResponse.json({ success: true, book: newBook });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
