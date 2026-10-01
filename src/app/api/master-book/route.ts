import { NextResponse } from 'next/server';
import { getConsolidatedMasterBookData } from '@/lib/db/queries';
import { requireAuth } from '@/lib/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const consolidatedData = getConsolidatedMasterBookData(year, month, user!.id);
    return NextResponse.json({ success: true, data: consolidatedData });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
