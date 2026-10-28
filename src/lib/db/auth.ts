import bcrypt from 'bcryptjs';
import { getAsyncDb } from './client';
import { SEED_BOOKS, SEED_CATEGORY_HEADS } from './seeds';

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash?: string | null;
  image?: string | null;
  tier?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const db = getAsyncDb();
  const row = await db.get<DbUser>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email.trim());
  return row || null;
}

export async function getUserById(id: number): Promise<DbUser | null> {
  const db = getAsyncDb();
  const row = await db.get<DbUser>('SELECT id, name, email, image, tier, created_at, updated_at FROM users WHERE id = ?', id);
  return row || null;
}

export async function verifyUserPassword(email: string, passwordPlain: string): Promise<DbUser | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) {
    return null;
  }

  const isValid = await bcrypt.compare(passwordPlain, user.password_hash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    tier: user.tier,
    created_at: user.created_at,
  };
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  image?: string;
}): Promise<DbUser> {
  const db = getAsyncDb();
  const emailNorm = data.email.trim().toLowerCase();

  const existing = await getUserByEmail(emailNorm);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  let passwordHash: string | null = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const res = await db.run(`
    INSERT INTO users (name, email, password_hash, image, tier)
    VALUES (?, ?, ?, ?, 'pro')
  `, data.name.trim(), emailNorm, passwordHash, data.image || null);
  const userId = Number(res.lastInsertRowid);

  // Initialize isolated workspace data for this new tenant
  await seedUserWorkspace(userId);

  return (await getUserById(userId))!;
}

export async function seedUserWorkspace(userId: number): Promise<void> {
  const db = getAsyncDb();

  // 1. Seed Books for User
  const bookIds: { [name: string]: number } = {};
  for (const b of SEED_BOOKS) {
    const res = await db.run(`
      INSERT INTO account_books (user_id, name, currency_code, description, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, userId, b.name, b.currency_code, b.description, b.is_default, b.sort_order);
    bookIds[b.name] = Number(res.lastInsertRowid);
  }

  // 2. Fetch institutions for mapping
  const insts = await db.all<{ id: number; name: string }>('SELECT id, name FROM institutions');
  const hdfc = insts.find((i) => i.name.includes('HDFC'))?.id ?? null;
  const sbi = insts.find((i) => i.name.includes('State Bank'))?.id ?? null;
  const enbd = insts.find((i) => i.name.includes('Emirates NBD'))?.id ?? null;
  const chase = insts.find((i) => i.name.includes('Chase'))?.id ?? null;

  const homeBookId = bookIds['Home Land (India)'];
  const uaeBookId = bookIds['UAE Expenses'];
  const usBookId = bookIds['US Travel'];

  if (homeBookId) {
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', homeBookId, null, 'Cash in Hand (INR)', 'cash', 'INR', null, 5000, 5000, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', homeBookId, hdfc, 'HDFC Bank Savings', 'bank', 'INR', '4821', 50000, 50000, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', homeBookId, sbi, 'SBI Account', 'bank', 'INR', '1092', 25000, 25000, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', homeBookId, hdfc, 'HDFC Credit Card', 'credit_card', 'INR', '8812', 0, 0, 150000, 15);
  }

  if (uaeBookId) {
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', uaeBookId, null, 'Cash in Hand (AED)', 'cash', 'AED', null, 1000, 1000, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', uaeBookId, enbd, 'Emirates NBD Current', 'bank', 'AED', '7731', 12000, 12000, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', uaeBookId, enbd, 'ENBD Credit Card', 'credit_card', 'AED', '3304', 0, 0, 25000, 1);
  }

  if (usBookId) {
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', usBookId, null, 'Cash in Hand (USD)', 'cash', 'USD', null, 500, 500, 0, null);
    await db.run('INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', usBookId, chase, 'Chase Sapphire Card', 'credit_card', 'USD', '9120', 0, 0, 8000, 20);
  }

  // 3. Seed Category Heads & Categories for this user
  for (const head of SEED_CATEGORY_HEADS) {
    const res = await db.run(`
      INSERT INTO category_heads (user_id, name, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `, userId, head.name, head.icon, head.color, head.sort_order);
    const headId = Number(res.lastInsertRowid);
    for (const sub of head.sub_heads) {
      await db.run(`
        INSERT INTO categories (user_id, head_id, name, group_name, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, userId, headId, sub.name, head.name, sub.icon || head.icon, sub.color || head.color, sub.sort_order);
    }
  }
}
