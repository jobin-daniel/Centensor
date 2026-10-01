import { NextResponse } from 'next/server';
import { getExpenseDashboardData } from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookId = bookIdParam === 'all' ? 'all' : (bookIdParam ? parseInt(bookIdParam, 10) : undefined);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const period = (searchParams.get('period') as 'month' | 'year' | 'all') || 'month';

    const data = getExpenseDashboardData({
      bookId,
      year,
      month,
      period,
      userId: user!.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
