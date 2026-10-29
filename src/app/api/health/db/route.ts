import { NextResponse } from 'next/server';
import { getAsyncDb, getD1, isCloudflare } from '@/lib/db/client';
import { getAccountBooks, getAccounts } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAsyncDb();
    const d1 = getD1();
    const result = await db.get<{ count: number }>('SELECT count(*) as count FROM users');
    const books = await getAccountBooks(1);
    const accounts = await getAccounts(undefined, 1);
    const txResult = await db.get<{ count: number }>('SELECT count(*) as count FROM transactions');
    
    return NextResponse.json({
      status: 'connected',
      environment: isCloudflare() ? 'Cloudflare Workers' : 'Local Node.js',
      engine: d1 ? 'Cloudflare D1 (centensor-db)' : 'Local SQLite',
      userCount: result?.count ?? 0,
      booksCount: books.length,
      books: books.map((b) => ({ id: b.id, name: b.name, user_id: b.user_id })),
      accountsCount: accounts.length,
      transactionsCount: txResult?.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database health ping failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        environment: isCloudflare() ? 'Cloudflare Workers' : 'Local Node.js',
        message: error.message || 'Database connection error',
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

