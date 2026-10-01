import { NextResponse } from 'next/server';
import { getMonthlyWorksheetData } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const bookId = parseInt(searchParams.get('bookId') || '1', 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const worksheetData = getMonthlyWorksheetData(bookId, year, month);
    return NextResponse.json({ success: true, data: worksheetData });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
