import { NextResponse } from 'next/server';
import { getExpenseDashboardData } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookIdParam = searchParams.get('bookId');
    const bookId = bookIdParam === 'all' ? 'all' : (bookIdParam ? parseInt(bookIdParam, 10) : undefined);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : 2015;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : 1;
    const period = (searchParams.get('period') as 'month' | 'year' | 'all') || 'month';

    const data = getExpenseDashboardData({
      bookId,
      year,
      month,
      period,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
