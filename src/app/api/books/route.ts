import { NextResponse } from 'next/server';
import { getAccountBooks, createAccountBook } from '@/lib/db/queries';

export async function GET() {
  try {
    const books = getAccountBooks();
    return NextResponse.json({ success: true, books });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.currency_code) {
      return NextResponse.json({ success: false, error: 'Name and currency code are required' }, { status: 400 });
    }
    const newBook = createAccountBook(body);
    return NextResponse.json({ success: true, book: newBook });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
