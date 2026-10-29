import { auth } from '@/auth';
import { getUserByEmail } from '@/lib/db/auth';
import { NextResponse } from 'next/server';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: Number(session.user.id),
        name: session.user.name || '',
        email: session.user.email || '',
      };
    }
    if (session?.user?.email) {
      const dbUser = await getUserByEmail(session.user.email);
      if (dbUser) {
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error reading auth session:', error);
    return null;
  }
}

export async function requireAuth(): Promise<{ user: AuthUser | null; errorResponse: NextResponse | null }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}
