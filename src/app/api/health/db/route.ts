import { NextResponse } from 'next/server';
import { getAsyncDb, getD1, isCloudflare } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAsyncDb();
    const d1 = getD1();
    const result = await db.get<{ count: number }>('SELECT count(*) as count FROM users');
    
    return NextResponse.json({
      status: 'connected',
      environment: isCloudflare() ? 'Cloudflare Workers' : 'Local Node.js',
      engine: d1 ? 'Cloudflare D1 (centensor-db)' : 'Local SQLite',
      userCount: result?.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database health ping failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        environment: isCloudflare() ? 'Cloudflare Workers' : 'Local Node.js',
        message: error.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

