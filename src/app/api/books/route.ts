import { NextResponse } from 'next/server';
import { getAccountBooks, createAccountBook, updateAccountBook, deleteAccountBook } from '@/lib/db/queries';
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

    // Check if this is an action-dispatched POST
    if (body.action === 'update') {
      const { id, ...data } = body.payload || body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Account Book ID is required' }, { status: 400 });
      }
      const updated = updateAccountBook(Number(id), data, user!.id);
      return NextResponse.json({ success: true, book: updated });
    }

    if (body.action === 'delete') {
      const id = body.payload?.id || body.id;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Account Book ID is required' }, { status: 400 });
      }
      const res = deleteAccountBook(Number(id), user!.id);
      return NextResponse.json(res);
    }

    if (!body.name || !body.currency_code) {
      return NextResponse.json({ success: false, error: 'Name and currency code are required' }, { status: 400 });
    }

    const newBook = createAccountBook({
      user_id: user!.id,
      name: body.name,
      currency_code: body.currency_code,
      description: body.description,
      is_default: body.is_default !== undefined ? (body.is_default ? 1 : 0) : undefined,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
    });

    return NextResponse.json({ success: true, book: newBook });
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
      return NextResponse.json({ success: false, error: 'Account Book ID is required' }, { status: 400 });
    }

    const updated = updateAccountBook(Number(id), data, user!.id);
    return NextResponse.json({ success: true, book: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // body wasn't JSON or was empty
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Account Book ID is required' }, { status: 400 });
    }

    const res = deleteAccountBook(Number(id), user!.id);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
