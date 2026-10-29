import { getAsyncDb } from './client';
import { SEED_CATEGORY_HEADS } from './seeds';
import {
  AccountBook,
  Currency,
  Institution,
  Account,
  CategoryHead,
  Category,
  Transaction,
  MonthlyWorksheetData,
  CategoryWorksheetRow,
  MatrixCellData,
  DailySummary,
  ConsolidatedMasterBookData,
  PaymentMethod,
  TransactionType,
  ExpenseDashboardData,
  CategoryExpenseBreakdown,
  HeadExpenseBreakdown,
  GroupExpenseBreakdown,
  MonthlyTrendItem,
  DailyExpenseItem,
  WeekdayExpenseItem,
  PaymentMethodBreakdown,
  AccountExpenseBreakdown,
  MonthlyGlPreferences,
  WorksheetGroupSection,
  MonthlyBudgetData,
  HeadBudgetSummary,
  CategoryBudgetDetail,
  BudgetHistoricalMonth,
  MonthlyBudgetSummary,
  SmartBudgetRule,
  RecurringTransaction,
  RecurringFrequency,
  IncomeType,
  IncomeDashboardData,
  IncomeSummary,
  IncomeTypeBreakdown,
  IncomeMonthlyTrendItem,
  PettyHandLoanItem,
  IncomeStreamDefinition,
} from '../types';
import { INCOME_STREAM_DEFINITIONS, getIncomeStreamDef } from '../income-taxonomies';
import { getDaysInMonth, getMonthName, isWeekend, isCurrentDay, formatDateISO, getDayOfWeekAbbr } from '../formatters';

// --- Master Currencies ---
export async function getCurrencies(): Promise<Currency[]> {
  const db = getAsyncDb();
  return await db.prepare('SELECT * FROM currencies ORDER BY is_master_base DESC, code ASC').all() as unknown as Currency[];
}

export async function getMasterCurrency(): Promise<Currency> {
  const db = getAsyncDb();
  const row = await db.prepare('SELECT * FROM currencies WHERE is_master_base = 1').get() as unknown as Currency;
  if (row) return row;
  return { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchange_rate_to_master: 1.0, decimal_digits: 2, is_master_base: 1 };
}

export async function updateCurrencyRate(code: string, rate: number): Promise<void> {
  const db = getAsyncDb();
  await db.prepare('UPDATE currencies SET exchange_rate_to_master = ? WHERE code = ?').run(rate, code);
}

export async function setMasterCurrency(code: string): Promise<void> {
  const db = getAsyncDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    await db.prepare('UPDATE currencies SET is_master_base = 0').run();
    await db.prepare('UPDATE currencies SET is_master_base = 1, exchange_rate_to_master = 1.0 WHERE code = ?').run(code);
    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

// --- Account Books ---
export async function getAccountBooks(userId?: number): Promise<AccountBook[]> {
  const db = getAsyncDb();
  let query = `
    SELECT b.*, c.symbol as currency_symbol,
      (SELECT COUNT(*) FROM accounts a WHERE a.book_id = b.id) as accounts_count,
      (SELECT COUNT(*) FROM transactions t WHERE t.book_id = b.id) as transactions_count
    FROM account_books b
    LEFT JOIN currencies c ON b.currency_code = c.code
  `;
  const params: (string | number)[] = [];
  if (userId) {
    query += ` WHERE b.user_id = ?`;
    params.push(userId);
  }
  query += ` ORDER BY b.is_default DESC, b.sort_order ASC, b.name ASC`;
  const rows = await db.prepare(query).all(...params) as unknown as AccountBook[];
  return rows;
}

export async function getAccountBookById(id: number, userId?: number): Promise<AccountBook | null> {
  const db = getAsyncDb();
  let query = `
    SELECT b.*, c.symbol as currency_symbol,
      (SELECT COUNT(*) FROM accounts a WHERE a.book_id = b.id) as accounts_count,
      (SELECT COUNT(*) FROM transactions t WHERE t.book_id = b.id) as transactions_count
    FROM account_books b
    LEFT JOIN currencies c ON b.currency_code = c.code
    WHERE b.id = ?
  `;
  const params: (string | number)[] = [id];
  if (userId) {
    query += ` AND b.user_id = ?`;
    params.push(userId);
  }
  const row = await db.prepare(query).get(...params) as unknown as AccountBook;
  return row || null;
}

export async function createAccountBook(data: {
  user_id?: number;
  name: string;
  currency_code: string;
  description?: string;
  is_default?: number;
  sort_order?: number;
}): Promise<AccountBook> {
  const db = getAsyncDb();
  const isDefault = data.is_default ? 1 : 0;

  await db.exec('BEGIN TRANSACTION;');
  try {
    const curr = await db.prepare('SELECT code FROM currencies WHERE code = ?').get(data.currency_code);
    if (!curr) {
      throw new Error(`Currency '${data.currency_code}' is not supported. Please configure this currency first.`);
    }

    if (isDefault === 1) {
      if (data.user_id) {
        await db.prepare('UPDATE account_books SET is_default = 0 WHERE user_id = ?').run(data.user_id);
      } else {
        await db.prepare('UPDATE account_books SET is_default = 0 WHERE user_id IS NULL').run();
      }
    }

    const res = await db.prepare(`
      INSERT INTO account_books (user_id, name, currency_code, description, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM account_books WHERE (? IS NULL OR user_id = ?))))
    `).run(
      data.user_id || null,
      data.name.trim(),
      data.currency_code,
      data.description?.trim() || null,
      isDefault,
      data.sort_order !== undefined ? data.sort_order : null,
      data.user_id || null,
      data.user_id || null
    );
    
    const newId = Number(res.lastInsertRowid);
    // Create default cash account for this book
    await createAccount({
      book_id: newId,
      name: `Cash in Hand (${data.currency_code})`,
      type: 'cash',
      currency_code: data.currency_code,
      opening_balance: 0,
    });

    await db.exec('COMMIT;');
    return (await getAccountBookById(newId, data.user_id))!;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function updateAccountBook(
  id: number,
  data: {
    name?: string;
    currency_code?: string;
    description?: string | null;
    is_default?: number;
    sort_order?: number;
  },
  userId?: number
): Promise<AccountBook> {
  const db = getAsyncDb();
  const current = await getAccountBookById(id, userId);
  if (!current) throw new Error('Account book not found');

  await db.exec('BEGIN TRANSACTION;');
  try {
    if (data.currency_code) {
      const curr = await db.prepare('SELECT code FROM currencies WHERE code = ?').get(data.currency_code);
      if (!curr) {
        throw new Error(`Currency '${data.currency_code}' is not supported. Please configure this currency first.`);
      }
    }

    const isDefault = data.is_default !== undefined ? (data.is_default ? 1 : 0) : current.is_default;

    if (isDefault === 1 && current.is_default !== 1) {
      // Set all other books for this user to is_default = 0
      if (userId) {
        await db.prepare('UPDATE account_books SET is_default = 0 WHERE user_id = ? AND id != ?').run(userId, id);
      } else {
        await db.prepare('UPDATE account_books SET is_default = 0 WHERE (user_id IS NULL OR user_id = ?) AND id != ?').run(current.user_id || null, id);
      }
    }

    await db.prepare(`
      UPDATE account_books
      SET name = ?,
          currency_code = ?,
          description = ?,
          is_default = ?,
          sort_order = ?
      WHERE id = ?
    `).run(
      data.name !== undefined ? data.name.trim() : current.name,
      data.currency_code !== undefined ? data.currency_code : current.currency_code,
      data.description !== undefined ? (data.description ? data.description.trim() : null) : (current.description || null),
      isDefault,
      data.sort_order !== undefined ? data.sort_order : current.sort_order,
      id
    );

    await db.exec('COMMIT;');
    return (await getAccountBookById(id, userId))!;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function deleteAccountBook(
  id: number,
  userId?: number
): Promise<{ success: boolean; message?: string }> {
  const db = getAsyncDb();
  const current = await getAccountBookById(id, userId);
  if (!current) throw new Error('Account book not found');

  const countQuery = 'SELECT COUNT(*) as count FROM account_books WHERE (? IS NULL OR user_id = ?)';
  const totalBooks = (await db.prepare(countQuery).get(userId || null, userId || null) as { count: number })?.count ?? 0;

  if (totalBooks <= 1) {
    throw new Error('Cannot delete your only account book. A workspace must retain at least one active account book.');
  }

  await db.exec('BEGIN TRANSACTION;');
  try {
    const wasDefault = current.is_default === 1;

    // 1. Any transfers from other books to an account in this book: set to_account_id to NULL
    await db.prepare(`
      UPDATE transactions 
      SET to_account_id = NULL 
      WHERE to_account_id IN (SELECT id FROM accounts WHERE book_id = ?)
    `).run(id);

    // 2. Delete transactions in this book
    await db.prepare('DELETE FROM transactions WHERE book_id = ?').run(id);

    // 3. Delete accounts in this book
    await db.prepare('DELETE FROM accounts WHERE book_id = ?').run(id);

    // 4. Delete budgets in this book
    await db.prepare('DELETE FROM budgets WHERE book_id = ?').run(id);

    // 5. Delete worksheet preferences / heads / categories in this book
    await db.prepare('DELETE FROM monthly_worksheet_heads WHERE book_id = ?').run(id);
    await db.prepare('DELETE FROM monthly_worksheet_categories WHERE book_id = ?').run(id);

    // 6. Delete recurring transactions in this book
    await db.prepare('DELETE FROM recurring_transactions WHERE book_id = ?').run(id);

    // 7. Delete daily reconciliations in this book
    await db.prepare('DELETE FROM daily_reconciliations WHERE book_id = ?').run(id);

    // 8. Delete the account book itself
    let delQuery = 'DELETE FROM account_books WHERE id = ?';
    const delParams: (string | number)[] = [id];
    if (userId) {
      delQuery += ' AND user_id = ?';
      delParams.push(userId);
    }
    await db.prepare(delQuery).run(...delParams);

    // 9. If the deleted book was the default, promote another book as default
    if (wasDefault) {
      const promoteQuery = `
        UPDATE account_books 
        SET is_default = 1 
        WHERE id = (
          SELECT id FROM account_books 
          WHERE (? IS NULL OR user_id = ?) 
          ORDER BY sort_order ASC, id ASC 
          LIMIT 1
        )
      `;
      await db.prepare(promoteQuery).run(userId || null, userId || null);
    }

    await db.exec('COMMIT;');
    return { success: true, message: 'Account book and associated records deleted successfully.' };
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

// --- Institutions ---
export async function getInstitutions(): Promise<Institution[]> {
  const db = getAsyncDb();
  return await db.prepare('SELECT * FROM institutions ORDER BY country_code, name').all() as unknown as Institution[];
}

export async function createInstitution(data: { name: string; country_code: string; institution_type?: string }): Promise<Institution> {
  const db = getAsyncDb();
  const res = await db.prepare(`
    INSERT INTO institutions (name, country_code, institution_type)
    VALUES (?, ?, ?)
  `).run(data.name, data.country_code, data.institution_type || 'bank');
  return await db.prepare('SELECT * FROM institutions WHERE id = ?').get(res.lastInsertRowid) as unknown as Institution;
}

// --- Accounts ---
export async function getAccounts(bookId?: number, userId?: number): Promise<Account[]> {
  const db = getAsyncDb();
  let query = `
    SELECT a.*, b.name as book_name, i.name as institution_name, c.symbol as currency_symbol
    FROM accounts a
    JOIN account_books b ON a.book_id = b.id
    LEFT JOIN institutions i ON a.institution_id = i.id
    LEFT JOIN currencies c ON a.currency_code = c.code
    WHERE a.is_active = 1
  `;
  const params: (string | number | null)[] = [];
  if (bookId) {
    query += ' AND a.book_id = ?';
    params.push(bookId);
  }
  if (userId) {
    query += ' AND b.user_id = ?';
    params.push(userId);
  }
  query += ' ORDER BY a.type ASC, a.name ASC';
  return await db.prepare(query).all(...params) as unknown as Account[];
}

export async function createAccount(data: {
  book_id: number;
  institution_id?: number | null;
  name: string;
  type: string;
  currency_code: string;
  account_number_last4?: string | null;
  opening_balance?: number;
  credit_limit?: number;
  billing_cycle_day?: number | null;
}): Promise<Account> {
  const db = getAsyncDb();
  const opening = data.opening_balance || 0;
  const res = await db.prepare(`
    INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.book_id,
    data.institution_id || null,
    data.name,
    data.type,
    data.currency_code,
    data.account_number_last4 || null,
    opening,
    opening,
    data.credit_limit || 0,
    data.billing_cycle_day || null
  );

  return await db.prepare('SELECT * FROM accounts WHERE id = ?').get(res.lastInsertRowid) as unknown as Account;
}

export async function getAccountById(id: number, userId?: number): Promise<Account | null> {
  const db = getAsyncDb();
  let query = `
    SELECT a.*, b.name as book_name, i.name as institution_name, c.symbol as currency_symbol
    FROM accounts a
    JOIN account_books b ON a.book_id = b.id
    LEFT JOIN institutions i ON a.institution_id = i.id
    LEFT JOIN currencies c ON a.currency_code = c.code
    WHERE a.id = ?
  `;
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND b.user_id = ?';
    params.push(userId);
  }
  const row = await db.prepare(query).get(...params) as unknown as Account | undefined;
  return row || null;
}

export async function updateAccount(
  id: number,
  data: {
    book_id?: number;
    institution_id?: number | null;
    name?: string;
    type?: string;
    currency_code?: string;
    account_number_last4?: string | null;
    opening_balance?: number;
    credit_limit?: number;
    billing_cycle_day?: number | null;
    is_active?: number;
  },
  userId?: number
): Promise<Account> {
  const db = getAsyncDb();
  const current = await getAccountById(id, userId);
  if (!current) throw new Error('Account not found');

  await db.exec('BEGIN TRANSACTION;');
  try {
    let newCurrentBalance = current.current_balance;
    if (data.opening_balance !== undefined && data.opening_balance !== current.opening_balance) {
      const diff = data.opening_balance - current.opening_balance;
      newCurrentBalance = current.current_balance + diff;
    }

    await db.prepare(`
      UPDATE accounts
      SET book_id = ?,
          institution_id = ?,
          name = ?,
          type = ?,
          currency_code = ?,
          account_number_last4 = ?,
          opening_balance = ?,
          current_balance = ?,
          credit_limit = ?,
          billing_cycle_day = ?,
          is_active = ?
      WHERE id = ?
    `).run(
      data.book_id !== undefined ? data.book_id : current.book_id,
      data.institution_id !== undefined ? (data.institution_id ?? null) : (current.institution_id ?? null),
      data.name !== undefined ? data.name.trim() : current.name,
      data.type !== undefined ? data.type : current.type,
      data.currency_code !== undefined ? data.currency_code : current.currency_code,
      data.account_number_last4 !== undefined ? (data.account_number_last4 ?? null) : (current.account_number_last4 ?? null),
      data.opening_balance !== undefined ? data.opening_balance : current.opening_balance,
      newCurrentBalance,
      data.credit_limit !== undefined ? data.credit_limit : (current.credit_limit || 0),
      data.billing_cycle_day !== undefined ? (data.billing_cycle_day ?? null) : (current.billing_cycle_day ?? null),
      data.is_active !== undefined ? data.is_active : current.is_active,
      id
    );

    await db.exec('COMMIT;');
    return (await getAccountById(id, userId))!;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function deleteAccount(id: number, userId?: number): Promise<{ success: boolean; transactionsCount: number }> {
  const db = getAsyncDb();
  const current = await getAccountById(id, userId);
  if (!current) throw new Error('Account not found');

  const txCount = (await db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR to_account_id = ?').get(id, id) as { count: number })?.count ?? 0;

  if (txCount > 0) {
    // Soft delete / deactivate so historical transactions and ledgers remain intact
    await db.prepare('UPDATE accounts SET is_active = 0 WHERE id = ?').run(id);
    return { success: true, transactionsCount: txCount };
  }

  await db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  return { success: true, transactionsCount: 0 };
}

// --- Categories, Main Heads & Budgets ---

export async function getCategories(bookId?: number, monthStr?: string, userId?: number): Promise<Category[]> {
  const db = getAsyncDb();
  let query = `
    SELECT 
      c.id, c.user_id, c.head_id, c.name, c.group_name, c.icon, c.color, c.sort_order,
      h.name as head_name, h.icon as head_icon,
      b.amount as monthly_budget
    FROM categories c
    LEFT JOIN category_heads h ON c.head_id = h.id
    LEFT JOIN budgets b ON c.id = b.category_id AND b.book_id = ? AND b.month = ?
  `;
  const params: (string | number)[] = [bookId || 0, monthStr || ''];
  if (userId) {
    query += ` WHERE (c.user_id = ? OR c.user_id IS NULL)`;
    params.push(userId);
  }
  query += ` ORDER BY COALESCE(h.sort_order, 999) ASC, c.sort_order ASC, c.name ASC`;
  const rows = await db.prepare(query).all(...params) as unknown as Category[];
  return rows;
}

export async function getCategoryHeads(userId?: number): Promise<CategoryHead[]> {
  const db = getAsyncDb();
  let query = `SELECT * FROM category_heads`;
  const params: (string | number)[] = [];
  if (userId) {
    query += ` WHERE (user_id = ? OR user_id IS NULL)`;
    params.push(userId);
  }
  query += ` ORDER BY sort_order ASC, name ASC`;
  const heads = await db.prepare(query).all(...params) as unknown as CategoryHead[];

  const categories = await getCategories(undefined, undefined, userId);

  for (const h of heads) {
    h.sub_heads = categories.filter((c) => c.head_id === h.id || c.group_name === h.name);
    h.sub_categories_count = h.sub_heads.length;
  }

  return heads;
}

export async function getCategoryHeadById(id: number, userId?: number): Promise<CategoryHead | null> {
  const db = getAsyncDb();
  let query = 'SELECT * FROM category_heads WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  const head = await db.prepare(query).get(...params) as unknown as CategoryHead | undefined;
  if (!head) return null;
  const categories = await getCategories(undefined, undefined, userId);
  head.sub_heads = categories.filter((c) => c.head_id === head.id || c.group_name === head.name);
  head.sub_categories_count = head.sub_heads.length;
  return head;
}

export async function createCategoryHead(data: { user_id?: number; name: string; icon?: string; color?: string; sort_order?: number }): Promise<CategoryHead> {
  const db = getAsyncDb();
  const nextOrderRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM category_heads WHERE (? IS NULL OR user_id = ?)').get(data.user_id || null, data.user_id || null) as { next_order: number };
  const sortOrder = data.sort_order ?? nextOrderRow.next_order;

  const res = await db.prepare(`
    INSERT INTO category_heads (user_id, name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.user_id || null, data.name.trim(), data.icon || '📁', data.color || '#6366F1', sortOrder);

  return (await getCategoryHeadById(Number(res.lastInsertRowid), data.user_id))!;
}

export async function updateCategoryHead(id: number, data: { name: string; icon?: string; color?: string; sort_order?: number }): Promise<CategoryHead> {
  const db = getAsyncDb();
  const oldHead = await db.prepare('SELECT * FROM category_heads WHERE id = ?').get(id) as { name: string } | undefined;
  const newName = data.name.trim();

  await db.exec('BEGIN TRANSACTION;');
  try {
    await db.prepare(`
      UPDATE category_heads 
      SET name = ?, icon = ?, color = ?, sort_order = ?
      WHERE id = ?
    `).run(newName, data.icon || '📁', data.color || '#6366F1', data.sort_order ?? 0, id);

    // Keep categories.group_name in sync
    if (oldHead && oldHead.name !== newName) {
      await db.prepare('UPDATE categories SET group_name = ? WHERE head_id = ? OR group_name = ?').run(newName, id, oldHead.name);
    }

    await db.exec('COMMIT;');
    return (await getCategoryHeadById(id))!;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function deleteCategoryHead(id: number, cascade: boolean = false): Promise<void> {
  const db = getAsyncDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    if (cascade) {
      const subHeads = await db.prepare('SELECT id FROM categories WHERE head_id = ?').all(id) as { id: number }[];
      for (const s of subHeads) {
        await db.prepare('DELETE FROM budgets WHERE category_id = ?').run(s.id);
        await db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(s.id);
        await db.prepare('DELETE FROM categories WHERE id = ?').run(s.id);
      }
    } else {
      await db.prepare('UPDATE categories SET head_id = NULL WHERE head_id = ?').run(id);
    }

    await db.prepare('DELETE FROM category_heads WHERE id = ?').run(id);
    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function createCategory(data: {
  user_id?: number;
  head_id?: number | null;
  name: string;
  group_name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  monthly_budget?: number;
}): Promise<Category> {
  const db = getAsyncDb();
  let groupName = data.group_name || 'Other';
  let icon = data.icon;
  let color = data.color;

  if (data.head_id) {
    const head = await db.prepare('SELECT name, icon, color FROM category_heads WHERE id = ?').get(data.head_id) as { name: string; icon?: string; color?: string } | undefined;
    if (head) {
      groupName = head.name;
      if (!icon) icon = head.icon;
      if (!color) color = head.color;
    }
  }

  const nextOrderRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM categories WHERE (? IS NULL OR user_id = ?)').get(data.user_id || null, data.user_id || null) as { next_order: number };
  const sortOrder = data.sort_order ?? nextOrderRow.next_order;

  const res = await db.prepare(`
    INSERT INTO categories (user_id, head_id, name, group_name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.user_id || null, data.head_id || null, data.name.trim(), groupName, icon || '🏷️', color || '#6366F1', sortOrder);

  const newId = Number(res.lastInsertRowid);
  return await db.prepare('SELECT * FROM categories WHERE id = ?').get(newId) as unknown as Category;
}

export async function updateCategory(id: number, data: {
  head_id?: number | null;
  name?: string;
  group_name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  monthly_budget?: number;
}): Promise<Category> {
  const db = getAsyncDb();
  const current = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as unknown as Category | undefined;
  if (!current) throw new Error('Category not found');

  const headId = data.head_id !== undefined ? data.head_id : current.head_id;
  let groupName = data.group_name || current.group_name;

  if (headId) {
    const head = await db.prepare('SELECT name, icon, color FROM category_heads WHERE id = ?').get(headId) as { name: string; icon?: string; color?: string } | undefined;
    if (head) {
      groupName = head.name;
    }
  }

  await db.prepare(`
    UPDATE categories
    SET head_id = ?, name = ?, group_name = ?, icon = ?, color = ?, sort_order = ?
    WHERE id = ?
  `).run(
    headId || null,
    data.name ? data.name.trim() : current.name,
    groupName,
    data.icon || current.icon || '🏷️',
    data.color || current.color || '#6366F1',
    data.sort_order !== undefined ? data.sort_order : current.sort_order,
    id
  );

  return await db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as unknown as Category;
}

export async function deleteCategory(id: number): Promise<{ success: boolean; transactionsCount: number }> {
  const db = getAsyncDb();
  const txCount = (await db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number })?.count ?? 0;

  await db.exec('BEGIN TRANSACTION;');
  try {
    if (txCount > 0) {
      await db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(id);
    }
    await db.prepare('DELETE FROM budgets WHERE category_id = ?').run(id);
    await db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    await db.exec('COMMIT;');
    return { success: true, transactionsCount: txCount };
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function resetCategoriesToDefault(userId?: number): Promise<void> {
  const db = getAsyncDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    if (userId) {
      await db.prepare(`
        UPDATE transactions SET category_id = NULL 
        WHERE category_id IN (SELECT id FROM categories WHERE user_id = ?)
      `).run(userId);
      await db.prepare(`
        DELETE FROM budgets 
        WHERE category_id IN (SELECT id FROM categories WHERE user_id = ?)
      `).run(userId);
      await db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
      await db.prepare('DELETE FROM category_heads WHERE user_id = ?').run(userId);

      const insertHead = await db.prepare(`
        INSERT INTO category_heads (user_id, name, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `);
      const insertSub = await db.prepare(`
        INSERT INTO categories (user_id, head_id, name, group_name, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const head of SEED_CATEGORY_HEADS) {
        const res = await insertHead.run(userId, head.name, head.icon, head.color, head.sort_order);
        const headId = Number(res.lastInsertRowid);
        for (const sub of head.sub_heads) {
          await insertSub.run(userId, headId, sub.name, head.name, sub.icon || head.icon, sub.color || head.color, sub.sort_order);
        }
      }
    } else {
      await db.prepare('UPDATE transactions SET category_id = NULL').run();
      await db.prepare('DELETE FROM budgets').run();
      await db.prepare('DELETE FROM categories').run();
      await db.prepare('DELETE FROM category_heads').run();

      const insertHead = await db.prepare(`
        INSERT INTO category_heads (name, icon, color, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      const insertSub = await db.prepare(`
        INSERT INTO categories (head_id, name, group_name, icon, color, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const head of SEED_CATEGORY_HEADS) {
        const res = await insertHead.run(head.name, head.icon, head.color, head.sort_order);
        const headId = Number(res.lastInsertRowid);
        for (const sub of head.sub_heads) {
          await insertSub.run(headId, sub.name, head.name, sub.icon || head.icon, sub.color || head.color, sub.sort_order);
        }
      }
    }

    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function setCategoryBudget(bookId: number, categoryId: number, month: string, amount: number): Promise<void> {
  const db = getAsyncDb();
  await db.prepare(`
    INSERT INTO budgets (book_id, month, category_id, amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(book_id, month, category_id) DO UPDATE SET amount = excluded.amount
  `).run(bookId, month, categoryId, amount);
}

export async function setMultipleCategoryBudgets(bookId: number, month: string, items: { categoryId: number; amount: number }[]): Promise<void> {
  const db = getAsyncDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = await db.prepare(`
      INSERT INTO budgets (book_id, month, category_id, amount)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(book_id, month, category_id) DO UPDATE SET amount = excluded.amount
    `);
    for (const item of items) {
      await stmt.run(bookId, month, item.categoryId, Math.max(0, Number(item.amount) || 0));
    }
    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function copyBudgetsFromMonth(bookId: number, sourceMonth: string, targetMonth: string): Promise<{ copiedCount: number }> {
  const db = getAsyncDb();
  const sourceBudgets = await db.prepare(`
    SELECT category_id, amount FROM budgets WHERE book_id = ? AND month = ?
  `).all(bookId, sourceMonth) as { category_id: number; amount: number }[];

  if (sourceBudgets.length === 0) {
    return { copiedCount: 0 };
  }

  await db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = await db.prepare(`
      INSERT INTO budgets (book_id, month, category_id, amount)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(book_id, month, category_id) DO UPDATE SET amount = excluded.amount
    `);
    for (const b of sourceBudgets) {
      await stmt.run(bookId, targetMonth, b.category_id, b.amount);
    }
    await db.exec('COMMIT;');
    return { copiedCount: sourceBudgets.length };
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function clearMonthBudgets(bookId: number, month: string): Promise<void> {
  const db = getAsyncDb();
  await db.prepare('DELETE FROM budgets WHERE book_id = ? AND month = ?').run(bookId, month);
}

export async function applySmartBudgetRule(
  bookId: number,
  targetMonth: string,
  rule: SmartBudgetRule,
  userId?: number
): Promise<{ updatedCount: number }> {
  const db = getAsyncDb();
  const [yearStr, monthNumStr] = targetMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);

  const prevDate = new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const categories = await getCategories(bookId, prevMonthStr, userId);

  let newBudgets: { categoryId: number; amount: number }[] = [];

  if (rule === 'prev_month_budget') {
    const prevBudgets = await db.prepare(`
      SELECT category_id, amount FROM budgets WHERE book_id = ? AND month = ?
    `).all(bookId, prevMonthStr) as { category_id: number; amount: number }[];
    newBudgets = prevBudgets.map(b => ({ categoryId: b.category_id, amount: b.amount }));
  } else if (rule === 'prev_month_actual') {
    const prevActuals = await db.prepare(`
      SELECT category_id, COALESCE(SUM(amount), 0) as spent
      FROM transactions
      WHERE book_id = ? AND date LIKE ? AND type = 'expense' AND category_id IS NOT NULL
      GROUP BY category_id
    `).all(bookId, `${prevMonthStr}%`) as { category_id: number; spent: number }[];
    newBudgets = prevActuals.map(a => ({ categoryId: a.category_id, amount: Math.round(a.spent) }));
  } else if (rule === '3month_avg') {
    const threeMonthStartDate = new Date(year, month - 4, 1);
    const startStr = `${threeMonthStartDate.getFullYear()}-${String(threeMonthStartDate.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${targetMonth}-01`;

    const trailingActuals = await db.prepare(`
      SELECT category_id, COALESCE(SUM(amount), 0) as total_spent
      FROM transactions
      WHERE book_id = ? AND date >= ? AND date < ? AND type = 'expense' AND category_id IS NOT NULL
      GROUP BY category_id
    `).all(bookId, startStr, endStr) as { category_id: number; total_spent: number }[];

    newBudgets = trailingActuals.map(t => ({
      categoryId: t.category_id,
      amount: Math.round(t.total_spent / 3),
    }));
  } else if (rule === 'prev_budget_plus_5' || rule === 'prev_budget_plus_10' || rule === 'prev_budget_minus_5') {
    const factor = rule === 'prev_budget_plus_5' ? 1.05 : rule === 'prev_budget_plus_10' ? 1.10 : 0.95;
    const prevBudgets = await db.prepare(`
      SELECT category_id, amount FROM budgets WHERE book_id = ? AND month = ?
    `).all(bookId, prevMonthStr) as { category_id: number; amount: number }[];

    newBudgets = prevBudgets.map(b => ({
      categoryId: b.category_id,
      amount: Math.round(b.amount * factor),
    }));
  }

  if (newBudgets.length > 0) {
    await setMultipleCategoryBudgets(bookId, targetMonth, newBudgets);
  }

  return { updatedCount: newBudgets.length };
}

export async function getMonthlyBudgetData(
  bookId: number,
  year: number,
  month: number,
  userId?: number
): Promise<MonthlyBudgetData> {
  const db = getAsyncDb();
  const masterCurrency = await getMasterCurrency();
  const book = await getAccountBookById(bookId, userId) || (await getAccountBooks(userId))[0];
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = getMonthName(month);
  const daysInMonth = getDaysInMonth(year, month);

  // Previous month string
  const prevDate = new Date(year, month - 2, 1);
  const previousMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  // 3-month trailing start date
  const threeMonthStartDate = new Date(year, month - 4, 1);
  const threeMonthStartStr = `${threeMonthStartDate.getFullYear()}-${String(threeMonthStartDate.getMonth() + 1).padStart(2, '0')}-01`;
  const currentMonthStartStr = `${monthStr}-01`;

  // 1. Get Categories and Heads for user
  const heads = await getCategoryHeads(userId);
  const categories = await getCategories(book.id, monthStr, userId);

  // 2. Query current month transactions grouped by category
  const currentMonthTxs = await db.prepare(`
    SELECT category_id, COALESCE(SUM(amount), 0) as spent, COUNT(id) as count
    FROM transactions
    WHERE book_id = ? AND date LIKE ? AND type = 'expense' AND category_id IS NOT NULL
    GROUP BY category_id
  `).all(book.id, `${monthStr}%`) as { category_id: number; spent: number; count: number }[];

  const currentSpentMap = new Map<number, { spent: number; count: number }>();
  currentMonthTxs.forEach(t => currentSpentMap.set(t.category_id, { spent: t.spent, count: t.count }));

  // 3. Query previous month budgets
  const prevBudgetRows = await db.prepare(`
    SELECT category_id, amount FROM budgets WHERE book_id = ? AND month = ?
  `).all(book.id, previousMonthStr) as { category_id: number; amount: number }[];

  const prevBudgetMap = new Map<number, number>();
  prevBudgetRows.forEach(b => prevBudgetMap.set(b.category_id, b.amount));

  // 4. Query previous month actuals
  const prevMonthTxs = await db.prepare(`
    SELECT category_id, COALESCE(SUM(amount), 0) as spent
    FROM transactions
    WHERE book_id = ? AND date LIKE ? AND type = 'expense' AND category_id IS NOT NULL
    GROUP BY category_id
  `).all(book.id, `${previousMonthStr}%`) as { category_id: number; spent: number }[];

  const prevSpentMap = new Map<number, number>();
  prevMonthTxs.forEach(t => prevSpentMap.set(t.category_id, t.spent));

  // 5. Query 3-month trailing spending
  const trailingTxs = await db.prepare(`
    SELECT category_id, COALESCE(SUM(amount), 0) as total_spent
    FROM transactions
    WHERE book_id = ? AND date >= ? AND date < ? AND type = 'expense' AND category_id IS NOT NULL
    GROUP BY category_id
  `).all(book.id, threeMonthStartStr, currentMonthStartStr) as { category_id: number; total_spent: number }[];

  const trailingAvgMap = new Map<number, number>();
  trailingTxs.forEach(t => trailingAvgMap.set(t.category_id, Math.round(t.total_spent / 3)));

  // 6. Build CategoryBudgetDetail list
  const allCategories: CategoryBudgetDetail[] = categories.map(cat => {
    const budget = cat.monthly_budget || 0;
    const spentInfo = currentSpentMap.get(cat.id) || { spent: 0, count: 0 };
    const spent = spentInfo.spent;
    const variance = budget - spent;
    const utilizationPercent = budget > 0 ? (spent / budget) * 100 : 0;
    const prevMonthBudget = prevBudgetMap.get(cat.id) || 0;
    const prevMonthSpent = prevSpentMap.get(cat.id) || 0;
    const avg3MonthSpent = trailingAvgMap.get(cat.id) || 0;

    let status: CategoryBudgetDetail['status'] = 'safe';
    if (budget === 0 && spent === 0) {
      status = 'zero_spend';
    } else if (budget === 0 && spent > 0) {
      status = 'unbudgeted';
    } else if (spent > budget) {
      status = 'danger';
    } else if (utilizationPercent >= 80) {
      status = 'warning';
    } else {
      status = 'safe';
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      groupName: cat.group_name,
      headId: cat.head_id,
      headName: cat.head_name,
      headIcon: cat.head_icon,
      headColor: cat.color,
      icon: cat.icon,
      color: cat.color,
      budget,
      spent,
      variance,
      utilizationPercent,
      status,
      prevMonthBudget,
      prevMonthSpent,
      avg3MonthSpent,
      transactionCount: spentInfo.count,
    };
  });

  // 7. Build HeadBudgetSummary list
  const headMap = new Map<number, HeadBudgetSummary>();
  for (const h of heads) {
    headMap.set(h.id, {
      headId: h.id,
      headName: h.name,
      headIcon: h.icon || '📁',
      headColor: h.color || '#6366f1',
      totalBudget: 0,
      totalSpent: 0,
      variance: 0,
      utilizationPercent: 0,
      isOverBudget: false,
      categories: [],
    });
  }

  // Fallback 'Other' head if any category doesn't map to a head
  const otherHead: HeadBudgetSummary = {
    headId: 0,
    headName: 'Other Categories',
    headIcon: '🏷️',
    headColor: '#64748b',
    totalBudget: 0,
    totalSpent: 0,
    variance: 0,
    utilizationPercent: 0,
    isOverBudget: false,
    categories: [],
  };

  for (const catDetail of allCategories) {
    if (catDetail.headId && headMap.has(catDetail.headId)) {
      const h = headMap.get(catDetail.headId)!;
      h.categories.push(catDetail);
      h.totalBudget += catDetail.budget;
      h.totalSpent += catDetail.spent;
    } else {
      otherHead.categories.push(catDetail);
      otherHead.totalBudget += catDetail.budget;
      otherHead.totalSpent += catDetail.spent;
    }
  }

  const headList: HeadBudgetSummary[] = [];
  for (const h of headMap.values()) {
    if (h.categories.length > 0) {
      h.variance = h.totalBudget - h.totalSpent;
      h.utilizationPercent = h.totalBudget > 0 ? (h.totalSpent / h.totalBudget) * 100 : 0;
      h.isOverBudget = h.totalBudget > 0 && h.totalSpent > h.totalBudget;
      headList.push(h);
    }
  }
  if (otherHead.categories.length > 0) {
    otherHead.variance = otherHead.totalBudget - otherHead.totalSpent;
    otherHead.utilizationPercent = otherHead.totalBudget > 0 ? (otherHead.totalSpent / otherHead.totalBudget) * 100 : 0;
    otherHead.isOverBudget = otherHead.totalBudget > 0 && otherHead.totalSpent > otherHead.totalBudget;
    headList.push(otherHead);
  }

  // 8. 12-Month Historical Budget vs Actual for the selected year
  const historicalMonthlyComparison: BudgetHistoricalMonth[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let m = 1; m <= 12; m++) {
    const ymStr = `${year}-${String(m).padStart(2, '0')}`;
    const mBudgetRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as b_total
      FROM budgets
      WHERE book_id = ? AND month = ?
    `).get(book.id, ymStr) as { b_total: number };

    const mSpentRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as s_total
      FROM transactions
      WHERE book_id = ? AND date LIKE ? AND type = 'expense'
    `).get(book.id, `${ymStr}%`) as { s_total: number };

    const bVal = mBudgetRow?.b_total || 0;
    const sVal = mSpentRow?.s_total || 0;
    const vVal = bVal - sVal;
    const util = bVal > 0 ? (sVal / bVal) * 100 : 0;

    historicalMonthlyComparison.push({
      month: m,
      monthStr: monthNames[m - 1],
      yearMonth: ymStr,
      budget: bVal,
      spent: sVal,
      variance: vVal,
      utilizationPercent: util,
    });
  }

  // 9. Aggregate Summary Calculations
  const totalBudget = allCategories.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = allCategories.reduce((sum, c) => sum + c.spent, 0);
  const variance = totalBudget - totalSpent;
  const utilizationPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;

  const totalCategoriesCount = allCategories.length;
  const budgetedCategoriesCount = allCategories.filter(c => c.budget > 0).length;
  const overBudgetCategoriesCount = allCategories.filter(c => c.status === 'danger').length;
  const underBudgetCategoriesCount = allCategories.filter(c => c.status === 'safe' && c.budget > 0).length;
  const unbudgetedCategoriesCount = allCategories.filter(c => c.status === 'unbudgeted').length;

  // Run rate / EOM projection
  const now = new Date();
  const isCurrentMonthYear = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < (now.getMonth() + 1));
  const elapsedDays = isCurrentMonthYear ? Math.max(1, Math.min(now.getDate(), daysInMonth)) : isPastMonth ? daysInMonth : 1;

  const projectedEOMSpend = elapsedDays > 0 ? (totalSpent / elapsedDays) * daysInMonth : totalSpent;
  const dailyBudget = daysInMonth > 0 ? totalBudget / daysInMonth : 0;
  const dailyAvgSpent = elapsedDays > 0 ? totalSpent / elapsedDays : 0;

  // Previous month summary
  const prevMonthBudgetTotal = Array.from(prevBudgetMap.values()).reduce((a, b) => a + b, 0);
  const prevMonthSpentTotal = Array.from(prevSpentMap.values()).reduce((a, b) => a + b, 0);

  return {
    year,
    month,
    monthName,
    daysInMonth,
    book,
    masterCurrency,
    summary: {
      totalBudget,
      totalSpent,
      variance,
      utilizationPercent,
      isOverBudget,
      totalCategoriesCount,
      budgetedCategoriesCount,
      overBudgetCategoriesCount,
      underBudgetCategoriesCount,
      unbudgetedCategoriesCount,
      projectedEOMSpend,
      dailyBudget,
      dailyAvgSpent,
      previousMonthTotalBudget: prevMonthBudgetTotal,
      previousMonthTotalSpent: prevMonthSpentTotal,
    },
    heads: headList,
    allCategories,
    historicalMonthlyComparison,
    previousMonthStr,
  };
}

// --- Transactions ---
export async function createTransaction(data: {
  book_id: number;
  date: string;
  amount: number;
  category_id?: number | null;
  account_id: number;
  payment_method: PaymentMethod;
  type?: TransactionType;
  to_account_id?: number | null;
  description?: string;
  merchant?: string;
  notes?: string;
  income_type?: IncomeType | string;
  income_category?: string;
  repayment_due_date?: string;
  repayment_status?: string;
}): Promise<Transaction> {
  const db = getAsyncDb();
  const account = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(data.account_id) as { currency_code: string };
  const currencyCode = account?.currency_code || 'INR';
  
  // Get current conversion rate to master
  const curr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(currencyCode) as { exchange_rate_to_master: number };
  const rate = curr?.exchange_rate_to_master || 1.0;
  const masterAmount = data.amount * rate;
  const type = data.type || 'expense';

  await db.exec('BEGIN TRANSACTION;');
  try {
    const res = await db.prepare(`
      INSERT INTO transactions (
        book_id, date, amount, currency_code, exchange_rate_to_master,
        amount_master_currency, category_id, account_id, payment_method,
        type, to_account_id, description, merchant, notes,
        income_type, income_category, repayment_due_date, repayment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.book_id,
      data.date,
      data.amount,
      currencyCode,
      rate,
      masterAmount,
      data.category_id || null,
      data.account_id,
      data.payment_method,
      type,
      data.to_account_id || null,
      data.description || null,
      data.merchant || null,
      data.notes || null,
      data.income_type || null,
      data.income_category || null,
      data.repayment_due_date || null,
      data.repayment_status || (data.income_type === 'petty_hand_loan' ? 'pending' : null)
    );

    // Update account balances based on type
    if (type === 'expense') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
    } else if (type === 'income') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.account_id);
    } else if (type === 'bank_withdrawal') {
      // Transfer from Bank account to Cash in hand
      await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
      if (data.to_account_id) {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.to_account_id);
      }
    } else if (type === 'card_settlement') {
      // Bank pays credit card
      await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
      if (data.to_account_id) {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.to_account_id);
      }
    } else if (type === 'transfer') {
      // Generic Account Transfer (From source account to destination account)
      await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
      if (data.to_account_id) {
        const toAcc = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(data.to_account_id) as { currency_code: string } | undefined;
        let creditAmount = data.amount;
        if (toAcc && toAcc.currency_code !== currencyCode) {
          const toCurr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(toAcc.currency_code) as { exchange_rate_to_master: number } | undefined;
          const toRate = toCurr?.exchange_rate_to_master || 1.0;
          if (toRate > 0) {
            creditAmount = Number(((data.amount * rate) / toRate).toFixed(2));
          }
        }
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(creditAmount, data.to_account_id);
      }
    }

    await db.exec('COMMIT;');
    const newTxId = Number(res.lastInsertRowid);
    return (await getTransactionById(newTxId))!;
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function getTransactionById(id: number, userId?: number): Promise<Transaction | null> {
  const db = getAsyncDb();
  let query = `
    SELECT t.*, c.name as category_name, c.group_name as category_group, c.color as category_color,
           a.name as account_name, a.type as account_type,
           curr.symbol as currency_symbol, b.name as book_name,
           to_acc.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
    LEFT JOIN currencies curr ON t.currency_code = curr.code
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE t.id = ?
  `;
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND b.user_id = ?';
    params.push(userId);
  }
  const row = await db.prepare(query).get(...params) as unknown as Transaction;
  return row || null;
}

export async function deleteTransaction(id: number, userId?: number): Promise<void> {
  const db = getAsyncDb();
  const tx = await getTransactionById(id, userId);
  if (!tx) return;

  await db.exec('BEGIN TRANSACTION;');
  try {
    // Revert account balance effects
    if (tx.type === 'expense') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
    } else if (tx.type === 'income') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.account_id);
    } else if (tx.type === 'bank_withdrawal' || tx.type === 'card_settlement') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      if (tx.to_account_id) {
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.to_account_id);
      }
    } else if (tx.type === 'transfer') {
      await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      if (tx.to_account_id) {
        const toAcc = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(tx.to_account_id) as { currency_code: string } | undefined;
        let creditAmount = tx.amount;
        if (toAcc && toAcc.currency_code !== tx.currency_code) {
          const toCurr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(toAcc.currency_code) as { exchange_rate_to_master: number } | undefined;
          const toRate = toCurr?.exchange_rate_to_master || 1.0;
          const fromRate = tx.exchange_rate_to_master || 1.0;
          if (toRate > 0) {
            creditAmount = Number(((tx.amount * fromRate) / toRate).toFixed(2));
          }
        }
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(creditAmount, tx.to_account_id);
      }
    }

    await db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function getTransactions(filter: {
  book_id?: number;
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD
  category_id?: number;
  payment_method?: string;
  type?: string;
  income_type?: string;
  repayment_status?: string;
  search?: string;
  limit?: number;
  userId?: number;
}): Promise<Transaction[]> {
  const db = getAsyncDb();
  let query = `
    SELECT t.*, c.name as category_name, c.group_name as category_group, c.color as category_color,
           a.name as account_name, a.type as account_type,
           curr.symbol as currency_symbol, b.name as book_name,
           to_acc.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
    LEFT JOIN currencies curr ON t.currency_code = curr.code
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE 1=1
  `;
  const params: (string | number | null)[] = [];

  if (filter.userId) {
    query += ' AND b.user_id = ?';
    params.push(filter.userId);
  }
  if (filter.book_id) {
    query += ' AND t.book_id = ?';
    params.push(filter.book_id);
  }
  if (filter.date) {
    query += ' AND t.date = ?';
    params.push(filter.date);
  } else if (filter.month) {
    query += ' AND t.date LIKE ?';
    params.push(`${filter.month}%`);
  }
  if (filter.category_id) {
    query += ' AND t.category_id = ?';
    params.push(filter.category_id);
  }
  if (filter.type) {
    query += ' AND t.type = ?';
    params.push(filter.type);
  }
  if (filter.income_type) {
    query += ' AND t.income_type = ?';
    params.push(filter.income_type);
  }
  if (filter.repayment_status) {
    query += ' AND t.repayment_status = ?';
    params.push(filter.repayment_status);
  }
  if (filter.payment_method) {
    if (filter.payment_method === 'income') {
      query += " AND t.type = 'income'";
    } else {
      query += ' AND t.payment_method = ?';
      params.push(filter.payment_method);
    }
  }
  if (filter.search) {
    const term = `%${filter.search.trim()}%`;
    query += ` AND (
      t.description LIKE ? OR
      t.merchant LIKE ? OR
      t.income_category LIKE ? OR
      t.notes LIKE ? OR
      c.name LIKE ? OR
      a.name LIKE ?
    )`;
    params.push(term, term, term, term, term, term);
  }

  query += ' ORDER BY t.date DESC, t.id DESC';
  if (filter.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  return await db.prepare(query).all(...params) as unknown as Transaction[];
}

// --- Monthly Worksheet GL Heads Preferences Engine ---

export async function getMonthlyWorksheetGlPreferences(bookId: number, monthStr: string, userId: number): Promise<MonthlyGlPreferences> {
  const db = getAsyncDb();

  // 1. Check saved heads in monthly_worksheet_heads
  const savedHeadRows = await db.prepare(`
    SELECT head_id FROM monthly_worksheet_heads
    WHERE user_id = ? AND book_id = ? AND month = ?
    ORDER BY sort_order ASC, id ASC
  `).all(userId, bookId, monthStr) as { head_id: number }[];

  const savedCatRows = await db.prepare(`
    SELECT category_id FROM monthly_worksheet_categories
    WHERE user_id = ? AND book_id = ? AND month = ?
  `).all(userId, bookId, monthStr) as { category_id: number }[];

  const hasSavedPreferences = savedHeadRows.length > 0 || savedCatRows.length > 0;

  // 2. Find transactions in this month and book to get heads/categories with transactions
  const txSummaryRows = await db.prepare(`
    SELECT t.category_id, c.head_id, COUNT(*) as tx_count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.book_id = ? AND t.date LIKE ?
    GROUP BY t.category_id, c.head_id
  `).all(bookId, `${monthStr}%`) as { category_id: number; head_id: number | null; tx_count: number }[];

  const transactionCountsByCategory: Record<number, number> = {};
  const transactionCountsByHead: Record<number, number> = {};
  const categoriesWithTransactions: number[] = [];
  const headsWithTransactions: number[] = [];

  for (const row of txSummaryRows) {
    if (row.category_id) {
      transactionCountsByCategory[row.category_id] = row.tx_count;
      categoriesWithTransactions.push(row.category_id);
    }
    if (row.head_id) {
      transactionCountsByHead[row.head_id] = (transactionCountsByHead[row.head_id] || 0) + row.tx_count;
      if (!headsWithTransactions.includes(row.head_id)) {
        headsWithTransactions.push(row.head_id);
      }
    }
  }

  // 3. Compute selected heads and categories
  let selectedHeadIds: number[] = [];
  let selectedCategoryIds: number[] = [];

  if (hasSavedPreferences) {
    selectedHeadIds = savedHeadRows.map(r => r.head_id);
    selectedCategoryIds = savedCatRows.map(r => r.category_id);

    // Ensure any head/category with transactions is also in the selected lists
    for (const hId of headsWithTransactions) {
      if (!selectedHeadIds.includes(hId)) selectedHeadIds.push(hId);
    }
    for (const cId of categoriesWithTransactions) {
      if (!selectedCategoryIds.includes(cId)) selectedCategoryIds.push(cId);
    }
  } else if (headsWithTransactions.length > 0) {
    // Has transactions but no saved preferences yet
    selectedHeadIds = [...headsWithTransactions];
    selectedCategoryIds = [...categoriesWithTransactions];
  } else {
    // No saved preferences and no transactions
    selectedHeadIds = [];
    selectedCategoryIds = [];
  }

  // 4. Get available heads with sub_heads for this user
  const availableHeads = await getCategoryHeads(userId);

  // 5. Look for previous month's preferences
  const [y, m] = monthStr.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const prevMonthHeads = await db.prepare(`
    SELECT DISTINCT head_id FROM monthly_worksheet_heads
    WHERE user_id = ? AND book_id = ? AND month = ?
  `).all(userId, bookId, prevMonthStr) as { head_id: number }[];

  let previousMonth: { month: string; headIds: number[]; count: number } | null = null;
  if (prevMonthHeads.length > 0) {
    previousMonth = {
      month: prevMonthStr,
      headIds: prevMonthHeads.map(r => r.head_id),
      count: prevMonthHeads.length,
    };
  } else {
    // Check if any previous month has saved heads
    const anyPrev = await db.prepare(`
      SELECT month, COUNT(DISTINCT head_id) as count
      FROM monthly_worksheet_heads
      WHERE user_id = ? AND book_id = ? AND month < ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 1
    `).get(userId, bookId, monthStr) as { month: string; count: number } | undefined;

    if (anyPrev) {
      const anyPrevHeads = await db.prepare(`
        SELECT DISTINCT head_id FROM monthly_worksheet_heads
        WHERE user_id = ? AND book_id = ? AND month = ?
      `).all(userId, bookId, anyPrev.month) as { head_id: number }[];
      previousMonth = {
        month: anyPrev.month,
        headIds: anyPrevHeads.map(r => r.head_id),
        count: anyPrev.count,
      };
    }
  }

  return {
    bookId,
    month: monthStr,
    hasSavedPreferences,
    selectedHeadIds,
    selectedCategoryIds,
    headsWithTransactions,
    categoriesWithTransactions,
    transactionCountsByHead,
    transactionCountsByCategory,
    availableHeads,
    previousMonth,
  };
}

export async function saveMonthlyWorksheetGlPreferences(data: {
  bookId: number;
  monthStr: string;
  userId: number;
  headIds: number[];
  categoryIds?: number[];
}): Promise<MonthlyGlPreferences> {
  const db = getAsyncDb();
  const { bookId, monthStr, userId, headIds } = data;

  // Find all categories for the selected heads
  let categoryIdsToSave = data.categoryIds;
  if (!categoryIdsToSave || categoryIdsToSave.length === 0) {
    if (headIds.length > 0) {
      const placeholders = headIds.map(() => '?').join(',');
      const catRows = await db.prepare(`
        SELECT id FROM categories
        WHERE head_id IN (${placeholders}) AND (user_id = ? OR user_id IS NULL)
      `).all(...headIds, userId) as { id: number }[];
      categoryIdsToSave = catRows.map(r => r.id);
    } else {
      categoryIdsToSave = [];
    }
  }

  // Ensure any category with transactions in this month is also preserved
  const txCats = await db.prepare(`
    SELECT DISTINCT t.category_id, c.head_id
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.book_id = ? AND t.date LIKE ?
  `).all(bookId, `${monthStr}%`) as { category_id: number; head_id: number | null }[];

  const finalHeadIds = [...new Set(headIds)];
  const finalCategoryIds = [...new Set(categoryIdsToSave)];

  for (const r of txCats) {
    if (r.category_id && !finalCategoryIds.includes(r.category_id)) {
      finalCategoryIds.push(r.category_id);
    }
    if (r.head_id && !finalHeadIds.includes(r.head_id)) {
      finalHeadIds.push(r.head_id);
    }
  }

  await db.exec('BEGIN TRANSACTION;');
  try {
    await db.prepare(`
      DELETE FROM monthly_worksheet_heads
      WHERE user_id = ? AND book_id = ? AND month = ?
    `).run(userId, bookId, monthStr);

    await db.prepare(`
      DELETE FROM monthly_worksheet_categories
      WHERE user_id = ? AND book_id = ? AND month = ?
    `).run(userId, bookId, monthStr);

    const insertHead = await db.prepare(`
      INSERT INTO monthly_worksheet_heads (user_id, book_id, month, head_id, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (let idx = 0; idx < finalHeadIds.length; idx++) {
      const headId = finalHeadIds[idx];
      await insertHead.run(userId, bookId, monthStr, headId, idx + 1);
    }

    const insertCat = await db.prepare(`
      INSERT INTO monthly_worksheet_categories (user_id, book_id, month, category_id)
      VALUES (?, ?, ?, ?)
    `);
    for (const catId of finalCategoryIds) {
      await insertCat.run(userId, bookId, monthStr, catId);
    }

    await db.exec('COMMIT;');
    return await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function addGlHeadToMonth(bookId: number, monthStr: string, userId: number, headId: number): Promise<MonthlyGlPreferences> {
  const current = await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
  const headIds = [...new Set([...current.selectedHeadIds, headId])];

  const db = getAsyncDb();
  const subCats = await db.prepare(`
    SELECT id FROM categories WHERE head_id = ? AND (user_id = ? OR user_id IS NULL)
  `).all(headId, userId) as { id: number }[];

  const categoryIds = [...new Set([...current.selectedCategoryIds, ...subCats.map(c => c.id)])];
  return await saveMonthlyWorksheetGlPreferences({ bookId, monthStr, userId, headIds, categoryIds });
}

export async function removeGlHeadFromMonth(bookId: number, monthStr: string, userId: number, headId: number): Promise<MonthlyGlPreferences> {
  const current = await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
  if (current.headsWithTransactions.includes(headId)) {
    throw new Error('Cannot remove a GL head that has transactions recorded in this month.');
  }

  let baseHeadIds = current.selectedHeadIds;
  let baseCategoryIds = current.selectedCategoryIds;

  if (!current.hasSavedPreferences) {
    baseHeadIds = current.availableHeads.map((h) => h.id);
    const allCats = await getCategories(undefined, undefined, userId);
    baseCategoryIds = allCats.map((c) => c.id);
  }

  const headIds = baseHeadIds.filter((id) => id !== headId);
  const db = getAsyncDb();
  const subCats = await db.prepare(`
    SELECT id FROM categories WHERE head_id = ?
  `).all(headId) as { id: number }[];
  const subCatIdSet = new Set(subCats.map((c) => c.id));

  const categoryIds = baseCategoryIds.filter((id) => !subCatIdSet.has(id));
  return await saveMonthlyWorksheetGlPreferences({ bookId, monthStr, userId, headIds, categoryIds });
}

export async function copyPreviousMonthGlPreferences(bookId: number, currentMonthStr: string, userId: number, sourceMonthStr?: string): Promise<MonthlyGlPreferences> {
  const db = getAsyncDb();
  let source = sourceMonthStr;
  if (!source) {
    const prevPref = await db.prepare(`
      SELECT month FROM monthly_worksheet_heads
      WHERE user_id = ? AND book_id = ? AND month < ?
      ORDER BY month DESC LIMIT 1
    `).get(userId, bookId, currentMonthStr) as { month: string } | undefined;
    source = prevPref?.month;
  }

  if (!source) {
    const [y, m] = currentMonthStr.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    source = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const prevPrefs = await getMonthlyWorksheetGlPreferences(bookId, source, userId);
  if (prevPrefs.selectedHeadIds.length === 0) {
    throw new Error(`No GL heads were found in previous month (${source}) to copy.`);
  }

  return await saveMonthlyWorksheetGlPreferences({
    bookId,
    monthStr: currentMonthStr,
    userId,
    headIds: prevPrefs.selectedHeadIds,
    categoryIds: prevPrefs.selectedCategoryIds,
  });
}

export async function addAllGlHeadsToMonth(bookId: number, monthStr: string, userId: number): Promise<MonthlyGlPreferences> {
  const allHeads = await getCategoryHeads(userId);
  const headIds = allHeads.map(h => h.id);
  const allCats = await getCategories(undefined, undefined, userId);
  const categoryIds = allCats.map(c => c.id);
  return await saveMonthlyWorksheetGlPreferences({ bookId, monthStr, userId, headIds, categoryIds });
}

export async function reorderMonthlyGlHeads(
  bookId: number,
  monthStr: string,
  userId: number,
  orderedHeadIds: number[]
): Promise<MonthlyGlPreferences> {
  const db = getAsyncDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    const updateStmt = await db.prepare(`
      UPDATE monthly_worksheet_heads
      SET sort_order = ?
      WHERE user_id = ? AND book_id = ? AND month = ? AND head_id = ?
    `);
    for (let index = 0; index < orderedHeadIds.length; index++) {
      const headId = orderedHeadIds[index];
      await updateStmt.run(index + 1, userId, bookId, monthStr, headId);
    }
    await db.exec('COMMIT;');
    return await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function moveMonthlyGlHead(
  bookId: number,
  monthStr: string,
  userId: number,
  headId: number,
  direction: 'up' | 'down'
): Promise<MonthlyGlPreferences> {
  const prefs = await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
  let currentHeadIds = [...prefs.selectedHeadIds];

  // If preferences weren't explicitly saved yet, initialize them first
  if (!prefs.hasSavedPreferences) {
    await saveMonthlyWorksheetGlPreferences({
      bookId,
      monthStr,
      userId,
      headIds: currentHeadIds,
      categoryIds: prefs.selectedCategoryIds,
    });
    const refreshed = await getMonthlyWorksheetGlPreferences(bookId, monthStr, userId);
    currentHeadIds = [...refreshed.selectedHeadIds];
  }

  const index = currentHeadIds.indexOf(headId);
  if (index === -1) return prefs;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentHeadIds.length) {
    return prefs;
  }

  // Swap positions
  const temp = currentHeadIds[index];
  currentHeadIds[index] = currentHeadIds[targetIndex];
  currentHeadIds[targetIndex] = temp;

  return await reorderMonthlyGlHeads(bookId, monthStr, userId, currentHeadIds);
}

// --- Monthly Worksheet Matrix Engine ---
export async function getMonthlyWorksheetData(bookId: number, year: number, month: number, userId?: number): Promise<MonthlyWorksheetData> {
  const db = getAsyncDb();
  const book = (bookId ? await getAccountBookById(bookId, userId) : null) || (await getAccountBooks(userId))[0];
  if (!book) {
    throw new Error('No account book found. Please create an account book first.');
  }
  const masterCurrency = await getMasterCurrency();
  const daysInMonth = getDaysInMonth(year, month);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = getMonthName(month);

  // 1. Get Categories and Budgets filtered by user's GL Heads preferences for this month
  const effectiveUserId = userId || 1;
  const glPrefs = await getMonthlyWorksheetGlPreferences(book.id, monthStr, effectiveUserId);
  const allCategories = await getCategories(book.id, monthStr, userId);

  let categories: Category[] = [];
  if (glPrefs.hasSavedPreferences) {
    const selectedCatSet = new Set(glPrefs.selectedCategoryIds);
    const selectedHeadSet = new Set(glPrefs.selectedHeadIds);
    categories = allCategories.filter(
      (c) => selectedCatSet.has(c.id) || (c.head_id && selectedHeadSet.has(c.head_id))
    );
  } else if (glPrefs.headsWithTransactions.length > 0) {
    const txCatSet = new Set(glPrefs.categoriesWithTransactions);
    const txHeadSet = new Set(glPrefs.headsWithTransactions);
    categories = allCategories.filter(
      (c) => txCatSet.has(c.id) || (c.head_id && txHeadSet.has(c.head_id))
    );
  } else {
    // Unconfigured month with no transactions: empty GL heads list so user adds heads for that month
    categories = [];
  }

  const categoriesMap = new Map<number, Category>();
  categories.forEach(c => categoriesMap.set(c.id, c));

  // 2. Fetch all transactions for this month and book
  const transactions = await getTransactions({
    book_id: book.id,
    month: monthStr,
    userId,
  });

  // 3. Find opening cash for this book at beginning of month
  // Check cash account opening balance + net cash transactions prior to this month
  const cashAccount = await db.prepare(`
    SELECT id, opening_balance FROM accounts
    WHERE book_id = ? AND type = 'cash' LIMIT 1
  `).get(book.id) as { id: number; opening_balance: number } | undefined;

  let runningCashBalance = cashAccount?.opening_balance || 0;
  if (cashAccount) {
    const priorCashFlow = await db.prepare(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN type = 'bank_withdrawal' AND to_account_id = ? THEN amount
          WHEN type = 'income' AND account_id = ? THEN amount
          WHEN type = 'expense' AND payment_method = 'cash' AND account_id = ? THEN -amount
          ELSE 0 
        END), 0) as net_prior
      FROM transactions
      WHERE book_id = ? AND date < ?
    `).get(cashAccount.id, cashAccount.id, cashAccount.id, book.id, `${monthStr}-01`) as { net_prior: number };

    runningCashBalance += priorCashFlow?.net_prior || 0;
  }
  const startingCashOfMonth = runningCashBalance;

  // 4. Build Matrix Cells [categoryId][day]
  // Initialize row structures
  const categoryRowsMap = new Map<number, CategoryWorksheetRow>();
  for (const cat of categories) {
    const cells: { [day: number]: MatrixCellData } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      cells[day] = {
        categoryId: cat.id,
        day,
        date: formatDateISO(year, month, day),
        totalAmount: 0,
        transactionCount: 0,
        transactions: [],
        hasCash: false,
        hasDebit: false,
        hasCredit: false,
      };
    }

    categoryRowsMap.set(cat.id, {
      category: cat,
      cells,
      monthTotal: 0,
      budget: cat.monthly_budget || 0,
      variance: cat.monthly_budget || 0,
      percentOfTotal: 0,
    });
  }

  // 5. Initialize Daily Summaries
  const dailySummaries: { [day: number]: DailySummary } = {};
  for (let day = 1; day <= daysInMonth; day++) {
    dailySummaries[day] = {
      day,
      date: formatDateISO(year, month, day),
      cashSpent: 0,
      cardSpent: 0,
      grandTotal: 0,
      bankWithdrawal: 0,
      eodCashComputed: 0,
      isToday: isCurrentDay(year, month, day),
      isWeekend: isWeekend(year, month, day),
    };
  }

  // 6. Populate cells and daily summaries with transactions
  let grandTotalExpenses = 0;
  let totalCashSpent = 0;
  let totalCardSpent = 0;
  let totalWithdrawals = 0;

  for (const tx of transactions) {
    const day = parseInt(tx.date.split('-')[2], 10);
    if (day < 1 || day > daysInMonth) continue;

    if (tx.type === 'expense') {
      grandTotalExpenses += tx.amount;
      if (tx.payment_method === 'cash') {
        dailySummaries[day].cashSpent += tx.amount;
        totalCashSpent += tx.amount;
      } else {
        dailySummaries[day].cardSpent += tx.amount;
        totalCardSpent += tx.amount;
      }
      dailySummaries[day].grandTotal += tx.amount;

      if (tx.category_id && categoryRowsMap.has(tx.category_id)) {
        const row = categoryRowsMap.get(tx.category_id)!;
        const cell = row.cells[day];
        cell.totalAmount += tx.amount;
        cell.transactionCount += 1;
        cell.transactions.push(tx);
        if (tx.payment_method === 'cash') cell.hasCash = true;
        if (tx.payment_method === 'debit_card') cell.hasDebit = true;
        if (tx.payment_method === 'credit_card') cell.hasCredit = true;
        row.monthTotal += tx.amount;
      }
    } else if (tx.type === 'bank_withdrawal') {
      dailySummaries[day].bankWithdrawal += tx.amount;
      totalWithdrawals += tx.amount;
    }
  }

  // 7. Calculate EOD Cash Rollup across days 1..daysInMonth
  let currentCash = startingCashOfMonth;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = dailySummaries[day];
    currentCash += d.bankWithdrawal - d.cashSpent;
    d.eodCashComputed = currentCash;
  }

  // 8. Calculate row variances and percentage of total
  let totalBudget = 0;
  for (const row of categoryRowsMap.values()) {
    row.variance = row.budget - row.monthTotal;
    row.percentOfTotal = grandTotalExpenses > 0 ? (row.monthTotal / grandTotalExpenses) * 100 : 0;
    totalBudget += row.budget;
  }

  // 9. Group rows by category group_name in customized GL Head order
  const categoriesByGroup: { [group: string]: CategoryWorksheetRow[] } = {};
  const groupHeadMap = new Map<string, { headId?: number; icon?: string; color?: string }>();

  // Initialize groups in the exact order of glPrefs.selectedHeadIds
  const headMap = new Map<number, CategoryHead>();
  glPrefs.availableHeads.forEach(h => headMap.set(h.id, h));

  for (const hId of glPrefs.selectedHeadIds) {
    const head = headMap.get(hId);
    if (head && !categoriesByGroup[head.name]) {
      categoriesByGroup[head.name] = [];
      groupHeadMap.set(head.name, { headId: head.id, icon: head.icon, color: head.color });
    }
  }

  // Populate rows into categoriesByGroup
  for (const row of categoryRowsMap.values()) {
    const head = row.category.head_id ? headMap.get(row.category.head_id) : undefined;
    const grp = head ? head.name : (row.category.group_name || 'Other');
    if (!categoriesByGroup[grp]) {
      categoriesByGroup[grp] = [];
      if (head) {
        groupHeadMap.set(grp, { headId: head.id, icon: head.icon, color: head.color });
      }
    }
    categoriesByGroup[grp].push(row);
  }

  // Prune any empty initialized groups and create groups array
  const groups: WorksheetGroupSection[] = [];
  for (const grp of Object.keys(categoriesByGroup)) {
    if (categoriesByGroup[grp].length === 0) {
      delete categoriesByGroup[grp];
    } else {
      const meta = groupHeadMap.get(grp);
      groups.push({
        headId: meta?.headId,
        name: grp,
        icon: meta?.icon,
        color: meta?.color,
        rows: categoriesByGroup[grp],
      });
    }
  }

  return {
    year,
    month,
    monthName,
    daysInMonth,
    book,
    masterCurrency,
    categoriesByGroup,
    groups,
    dailySummaries,
    monthTotals: {
      totalExpenses: grandTotalExpenses,
      totalBudget,
      totalCashSpent,
      totalCardSpent,
      totalWithdrawals,
      startingCash: startingCashOfMonth,
      endingCash: currentCash,
    },
    hasSavedGlPreferences: glPrefs.hasSavedPreferences,
    activeHeadCount: groups.length,
    totalAvailableHeads: glPrefs.availableHeads.length,
    activeHeadIds: glPrefs.selectedHeadIds,
  };
}

// --- Consolidated Master Book Data Engine ---
export async function getConsolidatedMasterBookData(year: number, month: number, userId?: number): Promise<ConsolidatedMasterBookData> {
  const db = getAsyncDb();
  const masterCurrency = await getMasterCurrency();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = getMonthName(month);

  const books = await getAccountBooks(userId);
  const bookSummaries: ConsolidatedMasterBookData['books'] = [];

  let grandTotalMaster = 0;

  for (const b of books) {
    const txs = await db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as local_total,
        COALESCE(SUM(amount_master_currency), 0) as master_total,
        COUNT(*) as count
      FROM transactions
      WHERE book_id = ? AND date LIKE ? AND type = 'expense'
    `).get(b.id, `${monthStr}%`) as { local_total: number; master_total: number; count: number };

    grandTotalMaster += txs.master_total;
    bookSummaries.push({
      book: b,
      totalLocalExpenses: txs.local_total,
      totalMasterExpenses: txs.master_total,
      transactionCount: txs.count,
    });
  }

  // Category totals across all books in master currency
  const catRows = userId ? (await db.prepare(`
    SELECT 
      c.id, c.name, c.group_name, c.icon, c.color, c.sort_order,
      COALESCE(SUM(t.amount_master_currency), 0) as total_master
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.date LIKE ? AND t.type = 'expense' AND t.book_id IN (SELECT id FROM account_books WHERE user_id = ?)
    WHERE (c.user_id = ? OR c.user_id IS NULL)
    GROUP BY c.id
    ORDER BY total_master DESC
  `).all(`${monthStr}%`, userId, userId) as unknown as (Category & { total_master: number })[])
  : (await db.prepare(`
    SELECT 
      c.id, c.name, c.group_name, c.icon, c.color, c.sort_order,
      COALESCE(SUM(t.amount_master_currency), 0) as total_master
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.date LIKE ? AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY total_master DESC
  `).all(`${monthStr}%`) as unknown as (Category & { total_master: number })[]);

  const categoryTotals = catRows.map(r => ({
    category: {
      id: r.id,
      name: r.name,
      group_name: r.group_name,
      icon: r.icon,
      color: r.color,
      sort_order: r.sort_order,
    },
    totalMasterAmount: r.total_master,
    percentOfTotal: grandTotalMaster > 0 ? (r.total_master / grandTotalMaster) * 100 : 0,
  }));

  // 12-month trend for the year
  const monthlyTrend: ConsolidatedMasterBookData['monthlyTrend'] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let m = 1; m <= 12; m++) {
    const mPrefix = `${year}-${String(m).padStart(2, '0')}%`;
    const mTotal = userId ? (await db.prepare(`
      SELECT COALESCE(SUM(amount_master_currency), 0) as total
      FROM transactions
      WHERE date LIKE ? AND type = 'expense' AND book_id IN (SELECT id FROM account_books WHERE user_id = ?)
    `).get(mPrefix, userId) as { total: number })
    : (await db.prepare(`
      SELECT COALESCE(SUM(amount_master_currency), 0) as total
      FROM transactions
      WHERE date LIKE ? AND type = 'expense'
    `).get(mPrefix) as { total: number });

    monthlyTrend.push({
      monthStr: monthNames[m - 1],
      totalMasterAmount: mTotal.total,
    });
  }

  return {
    masterCurrency,
    year,
    month,
    monthName,
    books: bookSummaries,
    categoryTotals,
    grandTotalMasterExpenses: grandTotalMaster,
    monthlyTrend,
  };
}

// =========================================================
// EXPENSES DASHBOARD DATA ENGINE
// =========================================================

export async function getExpenseDashboardData(params: {
  bookId?: number | 'all';
  year?: number;
  month?: number;
  period?: 'month' | 'year' | 'all';
  userId?: number;
}): Promise<ExpenseDashboardData> {
  const db = getAsyncDb();
  const masterCurrency = await getMasterCurrency();
  const books = await getAccountBooks(params.userId);

  const isConsolidated = params.bookId === 'all';
  const selectedBookId = isConsolidated ? null : (params.bookId || books[0]?.id || 1);
  const activeBook = !isConsolidated ? (books.find(b => b.id === selectedBookId) || books[0]) : null;

  // Determine available years from database
  const yrRows = params.userId
    ? (await db.prepare(`
        SELECT DISTINCT CAST(substr(t.date, 1, 4) AS INTEGER) as yr
        FROM transactions t
        JOIN account_books b ON t.book_id = b.id
        WHERE t.type = 'expense' AND b.user_id = ?
        ORDER BY yr DESC
      `).all(params.userId) as { yr: number }[])
    : (await db.prepare(`
        SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) as yr
        FROM transactions
        WHERE type = 'expense'
        ORDER BY yr DESC
      `).all() as { yr: number }[]);

  const availableYears = yrRows.length > 0 ? yrRows.map(r => r.yr) : [2015, new Date().getFullYear()];

  const year = params.year || availableYears[0] || 2015;
  const month = params.month || 1;
  const period = params.period || 'month';
  const monthName = getMonthName(month);
  const daysInMonth = getDaysInMonth(year, month);

  // Currency configuration
  const currency = isConsolidated
    ? {
        code: masterCurrency.code,
        symbol: masterCurrency.symbol,
        name: masterCurrency.name,
      }
    : {
        code: activeBook?.currency_code || 'INR',
        symbol: activeBook?.currency_symbol || '₹',
        name: activeBook?.currency_code || 'INR',
      };

  const bookName = isConsolidated
    ? 'All Account Books (Consolidated)'
    : (activeBook?.name || 'Account Book');

  const amtCol = isConsolidated ? 'amount_master_currency' : 'amount';

  // Base SQL filter pieces
  let bookFilterSql = '';
  const baseParams: (string | number)[] = [];
  if (!isConsolidated && selectedBookId) {
    bookFilterSql = 'AND t.book_id = ?';
    baseParams.push(selectedBookId);
  } else if (params.userId) {
    bookFilterSql = 'AND t.book_id IN (SELECT id FROM account_books WHERE user_id = ?)';
    baseParams.push(params.userId);
  }

  // Current period date filter
  let dateFilterSql = '';
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const yearStr = `${year}`;

  if (period === 'month') {
    dateFilterSql = 'AND t.date LIKE ?';
  } else if (period === 'year') {
    dateFilterSql = 'AND t.date LIKE ?';
  }

  const getDateParam = () => {
    if (period === 'month') return `${monthStr}%`;
    if (period === 'year') return `${yearStr}%`;
    return '%';
  };

  // 1. Current Period Expenses & Counts
  const currentParams = [...baseParams];
  if (period !== 'all') {
    currentParams.push(getDateParam());
  }

  const currentSummaryRow = await db.prepare(`
    SELECT 
      COALESCE(SUM(t.${amtCol}), 0) as total_expenses,
      COUNT(t.id) as count,
      COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.${amtCol} ELSE 0 END), 0) as cash_spent,
      COALESCE(SUM(CASE WHEN t.payment_method IN ('debit_card', 'credit_card') THEN t.${amtCol} ELSE 0 END), 0) as card_spent
    FROM transactions t
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
  `).get(...currentParams) as {
    total_expenses: number;
    count: number;
    cash_spent: number;
    card_spent: number;
  };

  const totalExpenses = currentSummaryRow.total_expenses;
  const transactionCount = currentSummaryRow.count;
  const cashSpent = currentSummaryRow.cash_spent;
  const cardSpent = currentSummaryRow.card_spent;

  // 2. Previous Period Comparison (MoM or YoY)
  let prevExpenses = 0;
  if (period === 'month') {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevParams = [...baseParams, `${prevMonthStr}%`];

    const prevRow = await db.prepare(`
      SELECT COALESCE(SUM(t.${amtCol}), 0) as prev_total
      FROM transactions t
      WHERE t.type = 'expense'
        ${bookFilterSql}
        AND t.date LIKE ?
    `).get(...prevParams) as { prev_total: number };
    prevExpenses = prevRow.prev_total;
  } else if (period === 'year') {
    const prevYearStr = `${year - 1}`;
    const prevParams = [...baseParams, `${prevYearStr}%`];
    const prevRow = await db.prepare(`
      SELECT COALESCE(SUM(t.${amtCol}), 0) as prev_total
      FROM transactions t
      WHERE t.type = 'expense'
        ${bookFilterSql}
        AND t.date LIKE ?
    `).get(...prevParams) as { prev_total: number };
    prevExpenses = prevRow.prev_total;
  }

  let momChangePercent: number | null = null;
  if (prevExpenses > 0) {
    momChangePercent = ((totalExpenses - prevExpenses) / prevExpenses) * 100;
  } else if (prevExpenses === 0 && totalExpenses > 0) {
    momChangePercent = 100;
  }

  // 3. Budgets check
  let totalBudget = 0;
  if (!isConsolidated && selectedBookId) {
    const budgetRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_budget
      FROM budgets
      WHERE book_id = ? AND month = ?
    `).get(selectedBookId, monthStr) as { total_budget: number };

    totalBudget = budgetRow?.total_budget || 0;
  }

  const budgetVariance = totalBudget > 0 ? totalBudget - totalExpenses : 0;
  const budgetUtilizationPercent = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
  const avgTransaction = transactionCount > 0 ? totalExpenses / transactionCount : 0;
  const avgDailyExpense = period === 'month'
    ? (daysInMonth > 0 ? totalExpenses / daysInMonth : 0)
    : (totalExpenses / 365);

  const cashRatio = totalExpenses > 0 ? (cashSpent / totalExpenses) * 100 : 0;
  const cardRatio = totalExpenses > 0 ? (cardSpent / totalExpenses) * 100 : 0;

  // 4. Category Breakdown
  const catQuery = `
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.group_name,
      c.color,
      c.icon,
      c.head_id,
      ch.name as head_name,
      ch.icon as head_icon,
      ch.color as head_color,
      COALESCE(SUM(t.${amtCol}), 0) as total_amount,
      COUNT(t.id) as count
    FROM categories c
    LEFT JOIN category_heads ch ON c.head_id = ch.id
    JOIN transactions t ON c.id = t.category_id
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
    GROUP BY c.id
    HAVING total_amount > 0
    ORDER BY total_amount DESC
  `;
  const catRows = await db.prepare(catQuery).all(...currentParams) as {
    category_id: number;
    category_name: string;
    group_name: string;
    color: string | null;
    icon: string | null;
    head_id: number | null;
    head_name: string | null;
    head_icon: string | null;
    head_color: string | null;
    total_amount: number;
    count: number;
  }[];

    // Load category budgets for this month if single book
    const catBudgetMap = new Map<number, number>();
    if (!isConsolidated && selectedBookId && period === 'month') {
      const bRows = await db.prepare('SELECT category_id, amount FROM budgets WHERE book_id = ? AND month = ?').all(selectedBookId, monthStr) as { category_id: number; amount: number }[];
      bRows.forEach(b => catBudgetMap.set(b.category_id, b.amount));
    }

  const categoryBreakdown: CategoryExpenseBreakdown[] = catRows.map(r => {
    const pct = totalExpenses > 0 ? (r.total_amount / totalExpenses) * 100 : 0;
    const avg = r.count > 0 ? r.total_amount / r.count : 0;
    const bAmt = catBudgetMap.get(r.category_id) || 0;
    const vAmt = bAmt > 0 ? bAmt - r.total_amount : 0;
    return {
      categoryId: r.category_id,
      categoryName: r.category_name,
      groupName: r.group_name,
      headId: r.head_id,
      headName: r.head_name,
      headIcon: r.head_icon,
      headColor: r.head_color,
      color: r.color || r.head_color || '#6366f1',
      icon: r.icon || r.head_icon || undefined,
      totalAmount: r.total_amount,
      percentOfTotal: pct,
      count: r.count,
      avgAmount: avg,
      budget: bAmt,
      variance: vAmt,
    };
  });

  // 4b. Category Heads Breakdown (Tata Neu Super-App Launcher)
  const allHeads = await getCategoryHeads(params.userId);
  const headMap = new Map<number, { headId: number; headName: string; headIcon: string; headColor: string; totalAmount: number; count: number }>();
  for (const h of allHeads) {
    headMap.set(h.id, {
      headId: h.id,
      headName: h.name,
      headIcon: h.icon || '📁',
      headColor: h.color || '#8b5cf6',
      totalAmount: 0,
      count: 0,
    });
  }

  for (const c of categoryBreakdown) {
    if (c.headId && headMap.has(c.headId)) {
      const h = headMap.get(c.headId)!;
      h.totalAmount += c.totalAmount;
      h.count += c.count;
    }
  }

  const headBreakdown: HeadExpenseBreakdown[] = Array.from(headMap.values()).map(h => ({
    ...h,
    percentOfTotal: totalExpenses > 0 ? (h.totalAmount / totalExpenses) * 100 : 0,
  }));

  // 5. Group Breakdown
  const groupMap = new Map<string, { totalAmount: number; count: number }>();
  for (const c of categoryBreakdown) {
    const grp = c.groupName || 'Other';
    const curr = groupMap.get(grp) || { totalAmount: 0, count: 0 };
    curr.totalAmount += c.totalAmount;
    curr.count += c.count;
    groupMap.set(grp, curr);
  }

  const groupBreakdown: GroupExpenseBreakdown[] = Array.from(groupMap.entries())
    .map(([groupName, g]) => ({
      groupName,
      totalAmount: g.totalAmount,
      percentOfTotal: totalExpenses > 0 ? (g.totalAmount / totalExpenses) * 100 : 0,
      count: g.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 6. 12-Month Trend for the Selected Year
  const monthlyTrend: MonthlyTrendItem[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let m = 1; m <= 12; m++) {
    const ymPrefix = `${year}-${String(m).padStart(2, '0')}`;
    const mParams = [...baseParams, `${ymPrefix}%`];
    const mRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(t.${amtCol}), 0) as total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.${amtCol} ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN t.payment_method IN ('debit_card', 'credit_card') THEN t.${amtCol} ELSE 0 END), 0) as card,
        COUNT(t.id) as count
      FROM transactions t
      WHERE t.type = 'expense'
        ${bookFilterSql}
        AND t.date LIKE ?
    `).get(...mParams) as { total: number; cash: number; card: number; count: number };

    monthlyTrend.push({
      month: m,
      monthStr: monthNames[m - 1],
      yearMonth: ymPrefix,
      totalExpenses: mRow.total,
      cashSpent: mRow.cash,
      cardSpent: mRow.card,
      transactionCount: mRow.count,
    });
  }

  // 7. Daily Trend (Days 1 to daysInMonth for current active month)
  const dailyTrend: DailyExpenseItem[] = [];
  let highestExpenseDay: { date: string; amount: number } | null = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = formatDateISO(year, month, d);
    const dParams = [...baseParams, isoDate];
    const dRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(t.${amtCol}), 0) as total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.${amtCol} ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN t.payment_method IN ('debit_card', 'credit_card') THEN t.${amtCol} ELSE 0 END), 0) as card,
        COUNT(t.id) as count
      FROM transactions t
      WHERE t.type = 'expense'
        ${bookFilterSql}
        AND t.date = ?
    `).get(...dParams) as { total: number; cash: number; card: number; count: number };

    const dayOfWeek = getDayOfWeekAbbr(year, month, d);
    dailyTrend.push({
      day: d,
      date: isoDate,
      dayOfWeek,
      totalExpenses: dRow.total,
      cashSpent: dRow.cash,
      cardSpent: dRow.card,
      transactionCount: dRow.count,
    });

    if (dRow.total > 0 && (!highestExpenseDay || dRow.total > highestExpenseDay.amount)) {
      highestExpenseDay = { date: isoDate, amount: dRow.total };
    }
  }

  // 8. Weekday Breakdown (Sun=0 to Sat=6)
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const wdRows = await db.prepare(`
    SELECT 
      CAST(strftime('%w', t.date) AS INTEGER) as weekday,
      COALESCE(SUM(t.${amtCol}), 0) as total,
      COUNT(t.id) as count
    FROM transactions t
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
    GROUP BY weekday
    ORDER BY weekday ASC
  `).all(...currentParams) as { weekday: number; total: number; count: number }[];

  const wdMap = new Map<number, { total: number; count: number }>();
  for (const r of wdRows) {
    wdMap.set(r.weekday, { total: r.total, count: r.count });
  }

  const weekdayBreakdown: WeekdayExpenseItem[] = weekdayNames.map((name, idx) => {
    const val = wdMap.get(idx) || { total: 0, count: 0 };
    return {
      dayIndex: idx,
      dayName: name,
      totalExpenses: val.total,
      percentOfTotal: totalExpenses > 0 ? (val.total / totalExpenses) * 100 : 0,
      count: val.count,
      avgExpense: val.count > 0 ? val.total / val.count : 0,
    };
  });

  // 9. Payment Method Breakdown
  const pmRows = await db.prepare(`
    SELECT 
      t.payment_method,
      COALESCE(SUM(t.${amtCol}), 0) as amount,
      COUNT(t.id) as count
    FROM transactions t
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
    GROUP BY t.payment_method
    ORDER BY amount DESC
  `).all(...currentParams) as { payment_method: PaymentMethod; amount: number; count: number }[];

  const pmLabels: Record<string, string> = {
    cash: 'Cash in Hand',
    debit_card: 'Debit Card & NetBanking',
    credit_card: 'Credit Card',
  };

  const paymentMethodBreakdown: PaymentMethodBreakdown[] = pmRows.map(r => ({
    method: r.payment_method,
    label: pmLabels[r.payment_method] || r.payment_method,
    amount: r.amount,
    percent: totalExpenses > 0 ? (r.amount / totalExpenses) * 100 : 0,
    count: r.count,
  }));

  // 10. Account Breakdown
  const accRows = await db.prepare(`
    SELECT 
      a.id,
      a.name as account_name,
      a.type as account_type,
      i.name as institution_name,
      COALESCE(SUM(t.${amtCol}), 0) as amount,
      COUNT(t.id) as count
    FROM accounts a
    JOIN transactions t ON a.id = t.account_id
    LEFT JOIN institutions i ON a.institution_id = i.id
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
    GROUP BY a.id
    ORDER BY amount DESC
  `).all(...currentParams) as {
    id: number;
    account_name: string;
    account_type: string;
    institution_name: string | null;
    amount: number;
    count: number;
  }[];

  const accountBreakdown: AccountExpenseBreakdown[] = accRows.map(r => ({
    accountId: r.id,
    accountName: r.account_name,
    accountType: r.account_type,
    institutionName: r.institution_name || undefined,
    amount: r.amount,
    percent: totalExpenses > 0 ? (r.amount / totalExpenses) * 100 : 0,
    count: r.count,
  }));

  // 11. Top Transactions (Highest outflows)
  const topRows = await db.prepare(`
    SELECT 
      t.*,
      c.name as category_name,
      c.color as category_color,
      a.name as account_name,
      curr.symbol as currency_symbol,
      b.name as book_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN currencies curr ON t.currency_code = curr.code
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE t.type = 'expense'
      ${bookFilterSql}
      ${period !== 'all' ? dateFilterSql : ''}
    ORDER BY t.${amtCol} DESC
    LIMIT 10
  `).all(...currentParams) as unknown as Transaction[];

  return {
    bookId: isConsolidated ? 'all' : (selectedBookId || 1),
    bookName,
    isConsolidated,
    period,
    year,
    month,
    monthName,
    summary: {
      totalExpenses,
      prevPeriodExpenses: prevExpenses,
      momChangePercent,
      transactionCount,
      avgTransaction,
      avgDailyExpense,
      totalBudget,
      budgetVariance,
      budgetUtilizationPercent,
      cashSpent,
      cardSpent,
      cashRatio,
      cardRatio,
      highestExpenseDay,
      currency,
    },
    categoryBreakdown,
    headBreakdown,
    groupBreakdown,
    monthlyTrend,
    dailyTrend,
    weekdayBreakdown,
    paymentMethodBreakdown,
    accountBreakdown,
    topTransactions: topRows,
    availableYears,
  };
}

// =========================================================
// RECURRING TRANSACTIONS & RECURRING INCOME ENGINE
// =========================================================

export function calculateNextDueDate(
  frequency: RecurringFrequency,
  fromDateStr: string,
  dayOfMonth?: number,
  dayOfWeek?: number
): string {
  const [year, month, day] = fromDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (frequency === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (frequency === 'biweekly') {
    date.setDate(date.getDate() + 14);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + 1);
    if (dayOfMonth) {
      const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(dayOfMonth, maxDays));
    }
  } else if (frequency === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
    if (dayOfMonth) {
      const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(dayOfMonth, maxDays));
    }
  } else if (frequency === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
    if (dayOfMonth) {
      const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      date.setDate(Math.min(dayOfMonth, maxDays));
    }
  }

  return formatDateISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export async function getRecurringTransactions(userId?: number, bookId?: number, type?: string): Promise<RecurringTransaction[]> {
  const db = getAsyncDb();
  let query = `
    SELECT r.*, b.name as book_name, a.name as account_name,
           c.name as category_name, curr.symbol as currency_symbol,
           to_acc.name as to_account_name
    FROM recurring_transactions r
    JOIN account_books b ON r.book_id = b.id
    JOIN accounts a ON r.account_id = a.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts to_acc ON r.to_account_id = to_acc.id
    LEFT JOIN currencies curr ON r.currency_code = curr.code
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  if (userId) {
    query += ' AND (r.user_id = ? OR r.user_id IS NULL)';
    params.push(userId);
  }
  if (bookId) {
    query += ' AND r.book_id = ?';
    params.push(bookId);
  }
  if (type) {
    query += ' AND r.type = ?';
    params.push(type);
  }
  query += ' ORDER BY r.is_active DESC, r.next_due_date ASC, r.name ASC';
  return await db.prepare(query).all(...params) as unknown as RecurringTransaction[];
}

export async function getRecurringTransactionById(id: number, userId?: number): Promise<RecurringTransaction | null> {
  const db = getAsyncDb();
  let query = `
    SELECT r.*, b.name as book_name, a.name as account_name,
           c.name as category_name, curr.symbol as currency_symbol,
           to_acc.name as to_account_name
    FROM recurring_transactions r
    JOIN account_books b ON r.book_id = b.id
    JOIN accounts a ON r.account_id = a.id
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN accounts to_acc ON r.to_account_id = to_acc.id
    LEFT JOIN currencies curr ON r.currency_code = curr.code
    WHERE r.id = ?
  `;
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (r.user_id = ? OR r.user_id IS NULL)';
    params.push(userId);
  }
  const row = await db.prepare(query).get(...params) as unknown as RecurringTransaction | undefined;
  return row || null;
}

export async function createRecurringTransaction(data: {
  user_id?: number;
  book_id: number;
  account_id: number;
  category_id?: number | null;
  type?: TransactionType;
  to_account_id?: number | null;
  name: string;
  amount: number;
  currency_code?: string;
  frequency: RecurringFrequency;
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string | null;
  payer_merchant?: string | null;
  description?: string | null;
  auto_post?: number;
  is_active?: number;
}): Promise<RecurringTransaction> {
  const db = getAsyncDb();
  const acc = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(data.account_id) as { currency_code: string } | undefined;
  const currencyCode = data.currency_code || acc?.currency_code || 'INR';

  const nextDue = data.start_date;

  const res = await db.prepare(`
    INSERT INTO recurring_transactions (
      user_id, book_id, account_id, category_id, type, to_account_id,
      name, amount, currency_code, frequency, day_of_month, day_of_week,
      start_date, end_date, next_due_date, payer_merchant, description,
      auto_post, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.user_id || null,
    data.book_id,
    data.account_id,
    data.category_id || null,
    data.type || 'income',
    data.to_account_id || null,
    data.name.trim(),
    data.amount,
    currencyCode,
    data.frequency || 'monthly',
    data.day_of_month || 1,
    data.day_of_week || 1,
    data.start_date,
    data.end_date || null,
    nextDue,
    data.payer_merchant || null,
    data.description || null,
    data.auto_post || 0,
    data.is_active !== undefined ? data.is_active : 1
  );

  return (await getRecurringTransactionById(Number(res.lastInsertRowid), data.user_id))!;
}

export async function updateRecurringTransaction(
  id: number,
  data: Partial<{
    book_id: number;
    account_id: number;
    category_id: number | null;
    type: TransactionType;
    to_account_id: number | null;
    name: string;
    amount: number;
    currency_code: string;
    frequency: RecurringFrequency;
    day_of_month: number;
    day_of_week: number;
    start_date: string;
    end_date: string | null;
    next_due_date: string;
    payer_merchant: string | null;
    description: string | null;
    auto_post: number;
    is_active: number;
  }>,
  userId?: number
): Promise<RecurringTransaction> {
  const db = getAsyncDb();
  const current = await getRecurringTransactionById(id, userId);
  if (!current) throw new Error('Recurring transaction not found');

  await db.prepare(`
    UPDATE recurring_transactions
    SET book_id = ?,
        account_id = ?,
        category_id = ?,
        type = ?,
        to_account_id = ?,
        name = ?,
        amount = ?,
        currency_code = ?,
        frequency = ?,
        day_of_month = ?,
        day_of_week = ?,
        start_date = ?,
        end_date = ?,
        next_due_date = ?,
        payer_merchant = ?,
        description = ?,
        auto_post = ?,
        is_active = ?
    WHERE id = ?
  `).run(
    data.book_id !== undefined ? data.book_id : current.book_id,
    data.account_id !== undefined ? data.account_id : current.account_id,
    data.category_id !== undefined ? (data.category_id ?? null) : (current.category_id ?? null),
    data.type !== undefined ? data.type : current.type,
    data.to_account_id !== undefined ? (data.to_account_id ?? null) : (current.to_account_id ?? null),
    data.name !== undefined ? data.name.trim() : current.name,
    data.amount !== undefined ? data.amount : current.amount,
    data.currency_code !== undefined ? data.currency_code : current.currency_code,
    data.frequency !== undefined ? data.frequency : current.frequency,
    data.day_of_month !== undefined ? (data.day_of_month ?? null) : (current.day_of_month ?? null),
    data.day_of_week !== undefined ? (data.day_of_week ?? null) : (current.day_of_week ?? null),
    data.start_date !== undefined ? data.start_date : current.start_date,
    data.end_date !== undefined ? (data.end_date ?? null) : (current.end_date ?? null),
    data.next_due_date !== undefined ? (data.next_due_date ?? null) : (current.next_due_date ?? null),
    data.payer_merchant !== undefined ? (data.payer_merchant ?? null) : (current.payer_merchant ?? null),
    data.description !== undefined ? (data.description ?? null) : (current.description ?? null),
    data.auto_post !== undefined ? data.auto_post : (current.auto_post ?? 0),
    data.is_active !== undefined ? data.is_active : current.is_active,
    id
  );

  return (await getRecurringTransactionById(id, userId))!;
}

export async function deleteRecurringTransaction(id: number, userId?: number): Promise<void> {
  const db = getAsyncDb();
  let query = 'DELETE FROM recurring_transactions WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  await db.prepare(query).run(...params);
}

export async function processRecurringTransaction(id: number, postDate?: string, userId?: number): Promise<{
  success: boolean;
  transaction: Transaction;
  nextDueDate: string;
}> {
  const db = getAsyncDb();
  const item = await getRecurringTransactionById(id, userId);
  if (!item) throw new Error('Recurring item not found');

  const executionDate = postDate || item.next_due_date || formatDateISO(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  // Determine payment method based on account type
  const acc = await db.prepare('SELECT type FROM accounts WHERE id = ?').get(item.account_id) as { type: string } | undefined;
  const pm: PaymentMethod = acc?.type === 'cash' ? 'cash' : acc?.type === 'credit_card' ? 'credit_card' : 'debit_card';

  // Create the actual transaction
  const tx = await createTransaction({
    book_id: item.book_id,
    date: executionDate,
    amount: item.amount,
    category_id: item.category_id,
    account_id: item.account_id,
    payment_method: pm,
    type: item.type,
    to_account_id: item.to_account_id,
    description: item.description || `${item.name} (${item.frequency})`,
    merchant: item.payer_merchant || undefined,
  });

  // Calculate next due date
  const nextDue = calculateNextDueDate(item.frequency, executionDate, item.day_of_month, item.day_of_week);

  await db.prepare(`
    UPDATE recurring_transactions
    SET last_processed_date = ?, next_due_date = ?
    WHERE id = ?
  `).run(executionDate, nextDue, id);

  return {
    success: true,
    transaction: tx,
    nextDueDate: nextDue,
  };
}

// =========================================================
// INCOME & INFLOW QUERIES ENGINE
// =========================================================

export async function toggleHandLoanRepayment(
  id: number,
  status: 'pending' | 'repaid',
  userId?: number
): Promise<Transaction | null> {
  const db = getAsyncDb();
  const tx = await getTransactionById(id, userId);
  if (!tx) return null;
  await db.prepare('UPDATE transactions SET repayment_status = ? WHERE id = ?').run(status, id);
  return await getTransactionById(id, userId);
}

export async function updateTransaction(
  id: number,
  data: {
    book_id?: number;
    date?: string;
    amount?: number;
    category_id?: number | null;
    account_id?: number;
    payment_method?: PaymentMethod;
    type?: TransactionType;
    to_account_id?: number | null;
    description?: string;
    merchant?: string;
    notes?: string;
    income_type?: IncomeType | string;
    income_category?: string;
    repayment_due_date?: string;
    repayment_status?: string;
  },
  userId?: number
): Promise<Transaction | null> {
  const db = getAsyncDb();
  const tx = await getTransactionById(id, userId);
  if (!tx) return null;

  await db.exec('BEGIN TRANSACTION;');
  try {
    const newAmount = data.amount !== undefined ? data.amount : tx.amount;
    const newAccountId = data.account_id !== undefined ? data.account_id : tx.account_id;
    const newType = data.type || tx.type;
    const newToAccountId = data.to_account_id !== undefined ? data.to_account_id : tx.to_account_id;

    const account = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(newAccountId) as { currency_code: string } | undefined;
    const currencyCode = account?.currency_code || tx.currency_code;
    const curr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(currencyCode) as { exchange_rate_to_master: number } | undefined;
    const rate = curr?.exchange_rate_to_master || 1.0;
    const masterAmount = newAmount * rate;

    const balanceAffected =
      newAmount !== tx.amount ||
      newAccountId !== tx.account_id ||
      newType !== tx.type ||
      newToAccountId !== tx.to_account_id;

    if (balanceAffected) {
      // Revert old effect
      if (tx.type === 'expense') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      } else if (tx.type === 'income') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.account_id);
      } else if (tx.type === 'bank_withdrawal' || tx.type === 'card_settlement') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
        if (tx.to_account_id) {
          await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.to_account_id);
        }
      } else if (tx.type === 'transfer') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
        if (tx.to_account_id) {
          const toAcc = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(tx.to_account_id) as { currency_code: string } | undefined;
          let creditAmount = tx.amount;
          if (toAcc && toAcc.currency_code !== tx.currency_code) {
            const toCurr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(toAcc.currency_code) as { exchange_rate_to_master: number } | undefined;
            const toRate = toCurr?.exchange_rate_to_master || 1.0;
            const fromRate = tx.exchange_rate_to_master || 1.0;
            if (toRate > 0) {
              creditAmount = Number(((tx.amount * fromRate) / toRate).toFixed(2));
            }
          }
          await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(creditAmount, tx.to_account_id);
        }
      }

      // Apply new effect
      if (newType === 'expense') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(newAmount, newAccountId);
      } else if (newType === 'income') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(newAmount, newAccountId);
      } else if (newType === 'bank_withdrawal' || newType === 'card_settlement') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(newAmount, newAccountId);
        if (newToAccountId) {
          await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(newAmount, newToAccountId);
        }
      } else if (newType === 'transfer') {
        await db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(newAmount, newAccountId);
        if (newToAccountId) {
          const toAcc = await db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(newToAccountId) as { currency_code: string } | undefined;
          let creditAmount = newAmount;
          if (toAcc && toAcc.currency_code !== currencyCode) {
            const toCurr = await db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(toAcc.currency_code) as { exchange_rate_to_master: number } | undefined;
            const toRate = toCurr?.exchange_rate_to_master || 1.0;
            if (toRate > 0) {
              creditAmount = Number(((newAmount * rate) / toRate).toFixed(2));
            }
          }
          await db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(creditAmount, newToAccountId);
        }
      }
    }

    await db.prepare(`
      UPDATE transactions
      SET book_id = COALESCE(?, book_id),
          date = COALESCE(?, date),
          amount = ?,
          currency_code = ?,
          exchange_rate_to_master = ?,
          amount_master_currency = ?,
          account_id = ?,
          to_account_id = ?,
          category_id = ?,
          payment_method = COALESCE(?, payment_method),
          type = ?,
          description = ?,
          merchant = ?,
          notes = ?,
          income_type = COALESCE(?, income_type),
          income_category = COALESCE(?, income_category),
          repayment_due_date = ?,
          repayment_status = COALESCE(?, repayment_status)
      WHERE id = ?
    `).run(
      data.book_id || null,
      data.date || null,
      newAmount,
      currencyCode,
      rate,
      masterAmount,
      newAccountId,
      newToAccountId ?? null,
      (data.category_id !== undefined ? data.category_id : tx.category_id) ?? null,
      data.payment_method || null,
      newType,
      (data.description !== undefined ? data.description : tx.description) ?? null,
      (data.merchant !== undefined ? data.merchant : tx.merchant) ?? null,
      (data.notes !== undefined ? data.notes : tx.notes) ?? null,
      data.income_type || null,
      data.income_category || null,
      (data.repayment_due_date !== undefined ? data.repayment_due_date : tx.repayment_due_date) ?? null,
      data.repayment_status || null,
      id
    );

    await db.exec('COMMIT;');
    return await getTransactionById(id, userId);
  } catch (e) {
    await db.exec('ROLLBACK;');
    throw e;
  }
}

export async function getIncomeDashboardData(params: {
  bookId?: number | 'all';
  year: number;
  month?: number | null;
  incomeType?: string;
  repaymentStatus?: string;
  search?: string;
  userId?: number;
}): Promise<IncomeDashboardData> {
  const db = getAsyncDb();
  const books = await getAccountBooks(params.userId);
  const masterCurrency = await getMasterCurrency();

  const isConsolidated = params.bookId === 'all';
  let activeBook = books[0];
  if (!isConsolidated && params.bookId) {
    const found = books.find((b) => b.id === Number(params.bookId));
    if (found) activeBook = found;
  }

  const currency = isConsolidated
    ? masterCurrency
    : {
        code: activeBook?.currency_code || 'INR',
        symbol: activeBook?.currency_symbol || '₹',
        name: activeBook?.name || 'Account Book',
      };

  const monthNum = params.month ? Number(params.month) : null;
  const monthName = monthNum ? getMonthName(monthNum) : 'Full Year';
  const monthPrefix = monthNum ? `${params.year}-${String(monthNum).padStart(2, '0')}` : `${params.year}`;

  let allIncomeQuery = `
    SELECT t.*,
           a.name as account_name, a.type as account_type,
           curr.symbol as currency_symbol, b.name as book_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN currencies curr ON t.currency_code = curr.code
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE t.type = 'income'
  `;
  const qParams: (string | number)[] = [];
  if (params.userId) {
    allIncomeQuery += ' AND b.user_id = ?';
    qParams.push(params.userId);
  }
  if (!isConsolidated && activeBook) {
    allIncomeQuery += ' AND t.book_id = ?';
    qParams.push(activeBook.id);
  }
  allIncomeQuery += ' AND t.date LIKE ?';
  qParams.push(`${monthPrefix}%`);

  if (params.incomeType) {
    allIncomeQuery += ' AND t.income_type = ?';
    qParams.push(params.incomeType);
  }
  if (params.repaymentStatus) {
    allIncomeQuery += ' AND t.repayment_status = ?';
    qParams.push(params.repaymentStatus);
  }
  if (params.search && params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    allIncomeQuery += ` AND (
      t.description LIKE ? OR
      t.merchant LIKE ? OR
      t.income_category LIKE ? OR
      t.notes LIKE ? OR
      a.name LIKE ?
    )`;
    qParams.push(term, term, term, term, term);
  }
  allIncomeQuery += ' ORDER BY t.date DESC, t.id DESC';

  const periodTxs = await db.prepare(allIncomeQuery).all(...qParams) as unknown as Transaction[];

  let totalIncome = 0;
  let totalIncomeMaster = 0;
  let totalHandLoans = 0;
  let pendingHandLoansTotal = 0;
  let pendingHandLoansCount = 0;
  let repaidHandLoansTotal = 0;
  let totalFarmIncome = 0;
  let totalStockCapital = 0;
  let totalInterest = 0;
  let totalInvestment = 0;
  let totalSalary = 0;
  let totalOther = 0;

  for (const tx of periodTxs) {
    const amt = isConsolidated ? tx.amount_master_currency : tx.amount;
    totalIncome += amt;
    totalIncomeMaster += tx.amount_master_currency;

    const itype = tx.income_type || 'other';
    if (itype === 'petty_hand_loan') {
      totalHandLoans += amt;
      if (tx.repayment_status === 'repaid') {
        repaidHandLoansTotal += amt;
      } else {
        pendingHandLoansTotal += amt;
        pendingHandLoansCount += 1;
      }
    } else if (itype === 'farm') {
      totalFarmIncome += amt;
    } else if (itype === 'stock_capital') {
      totalStockCapital += amt;
    } else if (itype === 'interest') {
      totalInterest += amt;
    } else if (itype === 'investment') {
      totalInvestment += amt;
    } else if (itype === 'salary') {
      totalSalary += amt;
    } else {
      totalOther += amt;
    }
  }

  const transactionCount = periodTxs.length;
  const avgIncomeTransaction = transactionCount > 0 ? totalIncome / transactionCount : 0;

  const summary: IncomeSummary = {
    totalIncome,
    totalIncomeMaster,
    transactionCount,
    avgIncomeTransaction,
    totalHandLoans,
    pendingHandLoansTotal,
    pendingHandLoansCount,
    repaidHandLoansTotal,
    totalFarmIncome,
    totalStockCapital,
    totalInterest,
    totalInvestment,
    totalSalary,
    totalOther,
    currency: {
      code: currency.code,
      symbol: currency.symbol,
      name: currency.name,
    },
  };

  const typeMap = new Map<string, { amount: number; masterAmount: number; count: number }>();
  for (const tx of periodTxs) {
    const itype = tx.income_type || 'other';
    const amt = isConsolidated ? tx.amount_master_currency : tx.amount;
    const existing = typeMap.get(itype) || { amount: 0, masterAmount: 0, count: 0 };
    existing.amount += amt;
    existing.masterAmount += tx.amount_master_currency;
    existing.count += 1;
    typeMap.set(itype, existing);
  }

  const activeDefs = await getIncomeTypes(params.userId);
  const typeBreakdown: IncomeTypeBreakdown[] = activeDefs.map((def) => {
    const data = typeMap.get(def.type) || { amount: 0, masterAmount: 0, count: 0 };
    return {
      type: def.type as IncomeType,
      label: def.label,
      icon: def.icon,
      color: def.color,
      totalAmount: data.amount,
      totalMasterAmount: data.masterAmount,
      percentOfTotal: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      count: data.count,
    };
  }).filter(
    (tb) =>
      tb.totalAmount > 0 ||
      tb.count > 0 ||
      activeDefs.find((d) => d.type === tb.type)?.is_active !== 0
  );

  typeBreakdown.sort((a, b) => b.totalAmount - a.totalAmount);

  let yearTrendQuery = `
    SELECT 
      strftime('%m', t.date) as m_str,
      COALESCE(SUM(CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END), 0) as total,
      COALESCE(SUM(CASE WHEN t.income_type = 'petty_hand_loan' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as hand_loans,
      COALESCE(SUM(CASE WHEN t.income_type = 'farm' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as farm,
      COALESCE(SUM(CASE WHEN t.income_type = 'stock_capital' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as stock_capital,
      COALESCE(SUM(CASE WHEN t.income_type = 'interest' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as interest,
      COALESCE(SUM(CASE WHEN t.income_type = 'investment' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as investment,
      COALESCE(SUM(CASE WHEN t.income_type = 'salary' THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as salary,
      COALESCE(SUM(CASE WHEN t.income_type NOT IN ('petty_hand_loan', 'farm', 'stock_capital', 'interest', 'investment', 'salary') OR t.income_type IS NULL THEN (CASE WHEN ? = 1 THEN t.amount_master_currency ELSE t.amount END) ELSE 0 END), 0) as other,
      COUNT(t.id) as count
    FROM transactions t
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE t.type = 'income' AND t.date LIKE ?
  `;
  const ytParams: (string | number)[] = [
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    isConsolidated ? 1 : 0,
    `${params.year}%`,
  ];
  if (params.userId) {
    yearTrendQuery += ' AND b.user_id = ?';
    ytParams.push(params.userId);
  }
  if (!isConsolidated && activeBook) {
    yearTrendQuery += ' AND t.book_id = ?';
    ytParams.push(activeBook.id);
  }
  yearTrendQuery += " GROUP BY strftime('%m', t.date)";

  const trendRows = await db.prepare(yearTrendQuery).all(...ytParams) as {
    m_str: string;
    total: number;
    hand_loans: number;
    farm: number;
    stock_capital: number;
    interest: number;
    investment: number;
    salary: number;
    other: number;
    count: number;
  }[];

  const trendMap = new Map<number, (typeof trendRows)[0]>();
  trendRows.forEach((r) => trendMap.set(parseInt(r.m_str, 10), r));

  const monthlyTrend: IncomeMonthlyTrendItem[] = [];
  for (let m = 1; m <= 12; m++) {
    const row = trendMap.get(m);
    monthlyTrend.push({
      month: m,
      monthStr: getMonthName(m).slice(0, 3),
      yearMonth: `${params.year}-${String(m).padStart(2, '0')}`,
      totalIncome: row?.total || 0,
      handLoanIncome: row?.hand_loans || 0,
      farmIncome: row?.farm || 0,
      stockCapitalIncome: row?.stock_capital || 0,
      interestIncome: row?.interest || 0,
      investmentIncome: row?.investment || 0,
      salaryIncome: row?.salary || 0,
      otherIncome: row?.other || 0,
      count: row?.count || 0,
    });
  }

  let handLoansQuery = `
    SELECT t.*, a.name as account_name, curr.symbol as currency_symbol, b.name as book_name
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN currencies curr ON t.currency_code = curr.code
    LEFT JOIN account_books b ON t.book_id = b.id
    WHERE t.type = 'income' AND t.income_type = 'petty_hand_loan'
  `;
  const hlParams: (string | number)[] = [];
  if (params.userId) {
    handLoansQuery += ' AND b.user_id = ?';
    hlParams.push(params.userId);
  }
  if (!isConsolidated && activeBook) {
    handLoansQuery += ' AND t.book_id = ?';
    hlParams.push(activeBook.id);
  }
  handLoansQuery += " ORDER BY CASE WHEN t.repayment_status = 'pending' THEN 0 ELSE 1 END ASC, t.date DESC LIMIT 50";

  const rawHandLoans = await db.prepare(handLoansQuery).all(...hlParams) as unknown as Transaction[];
  const handLoans: PettyHandLoanItem[] = rawHandLoans.map((hl) => ({
    id: hl.id,
    bookId: hl.book_id,
    bookName: hl.book_name,
    friendName: hl.merchant || 'Friend',
    amount: hl.amount,
    currencyCode: hl.currency_code,
    currencySymbol: hl.currency_symbol,
    dateBorrowed: hl.date,
    repaymentDueDate: hl.repayment_due_date || undefined,
    repaymentStatus: (hl.repayment_status as 'pending' | 'repaid') || 'pending',
    description: hl.description,
    notes: hl.notes,
    accountName: hl.account_name,
    accountId: hl.account_id,
  }));

  const accMap = new Map<number, { name: string; type: string; amount: number; count: number }>();
  for (const tx of periodTxs) {
    const amt = isConsolidated ? tx.amount_master_currency : tx.amount;
    const existing = accMap.get(tx.account_id) || {
      name: tx.account_name || 'Account',
      type: tx.account_type || 'bank',
      amount: 0,
      count: 0,
    };
    existing.amount += amt;
    existing.count += 1;
    accMap.set(tx.account_id, existing);
  }

  const accountBreakdown = Array.from(accMap.entries())
    .map(([accountId, val]) => ({
      accountId,
      accountName: val.name,
      accountType: val.type,
      amount: val.amount,
      percent: totalIncome > 0 ? (val.amount / totalIncome) * 100 : 0,
      count: val.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const yearRows = await db.prepare(`
    SELECT DISTINCT strftime('%Y', date) as y
    FROM transactions
    WHERE type = 'income' AND date IS NOT NULL
  `).all() as { y: string }[];
  const yearSet = new Set<number>([new Date().getFullYear(), params.year]);
  yearRows.forEach((r) => {
    const y = parseInt(r.y, 10);
    if (!isNaN(y)) yearSet.add(y);
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  return {
    bookId: params.bookId || activeBook?.id || 1,
    bookName: isConsolidated ? 'Consolidated Master Books' : activeBook?.name || 'Account Book',
    isConsolidated,
    year: params.year,
    month: monthNum,
    monthName,
    summary,
    typeBreakdown,
    monthlyTrend,
    handLoans,
    recentIncomes: periodTxs.slice(0, 100),
    accountBreakdown,
    availableYears,
  };
}

// =========================================================
// CONFIGURABLE INCOME TYPES MANAGEMENT ENGINE
// =========================================================

interface RawIncomeTypeRow {
  id: number;
  user_id: number | null;
  type_key: string;
  label: string;
  short_label: string;
  icon: string;
  color: string;
  description: string | null;
  payer_label: string | null;
  payer_placeholder: string | null;
  description_placeholder: string | null;
  subcategories: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
}

function parseIncomeTypeRow(row: RawIncomeTypeRow): IncomeStreamDefinition {
  let categories: string[] = [];
  if (row.subcategories) {
    try {
      categories = JSON.parse(row.subcategories);
    } catch {
      categories = [];
    }
  }
  return {
    id: row.id,
    user_id: row.user_id || undefined,
    type: row.type_key,
    label: row.label,
    shortLabel: row.short_label,
    icon: row.icon,
    color: row.color,
    description: row.description || '',
    defaultCategories: Array.isArray(categories) ? categories : [],
    payerLabel: row.payer_label || 'Payer / Source',
    payerPlaceholder: row.payer_placeholder || 'e.g. Source name',
    descriptionPlaceholder: row.description_placeholder || 'e.g. Income details',
    sort_order: row.sort_order,
    is_active: row.is_active,
  };
}

export async function seedDefaultIncomeTypesForUser(userId: number): Promise<void> {
  const db = getAsyncDb();
  const insertStmt = await db.prepare(`
    INSERT INTO income_types (
      user_id, type_key, label, short_label, icon, color, description,
      payer_label, payer_placeholder, description_placeholder,
      subcategories, sort_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  await db.exec('BEGIN TRANSACTION;');
  try {
    for (let index = 0; index < INCOME_STREAM_DEFINITIONS.length; index++) {
      const def = INCOME_STREAM_DEFINITIONS[index];
      await insertStmt.run(
        userId,
        def.type,
        def.label,
        def.shortLabel,
        def.icon,
        def.color,
        def.description,
        def.payerLabel,
        def.payerPlaceholder,
        def.descriptionPlaceholder,
        JSON.stringify(def.defaultCategories),
        index + 1
      );
    }
    await db.exec('COMMIT;');
  } catch (e) {
    await db.exec('ROLLBACK;');
    console.error('Failed to seed default income types for user:', e);
  }
}

export async function getIncomeTypes(userId?: number): Promise<IncomeStreamDefinition[]> {
  const db = getAsyncDb();
  let query = 'SELECT * FROM income_types';
  const params: (string | number)[] = [];
  if (userId) {
    query += ' WHERE (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  query += ' ORDER BY sort_order ASC, id ASC';

  let rows = await db.prepare(query).all(...params) as unknown as RawIncomeTypeRow[];

  // If user has no income types configured yet, seed defaults from INCOME_STREAM_DEFINITIONS
  if (rows.length === 0 && userId) {
    await seedDefaultIncomeTypesForUser(userId);
    rows = await db.prepare(query).all(...params) as unknown as RawIncomeTypeRow[];
  }

  if (rows.length === 0) {
    return INCOME_STREAM_DEFINITIONS;
  }

  return rows.map(parseIncomeTypeRow);
}

export async function createIncomeType(data: {
  user_id?: number;
  type: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description?: string;
  payerLabel?: string;
  payerPlaceholder?: string;
  descriptionPlaceholder?: string;
  defaultCategories: string[];
  sort_order?: number;
  is_active?: number;
}): Promise<IncomeStreamDefinition> {
  const db = getAsyncDb();
  const typeKey = data.type.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const sortOrder = data.sort_order ?? 99;

  const res = await db.prepare(`
    INSERT INTO income_types (
      user_id, type_key, label, short_label, icon, color, description,
      payer_label, payer_placeholder, description_placeholder,
      subcategories, sort_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.user_id || null,
    typeKey,
    data.label.trim(),
    data.shortLabel.trim(),
    data.icon || '💰',
    data.color || '#10b981',
    data.description || null,
    data.payerLabel || 'Payer / Source',
    data.payerPlaceholder || 'e.g. Source name',
    data.descriptionPlaceholder || 'e.g. Income details',
    JSON.stringify(data.defaultCategories || []),
    sortOrder,
    data.is_active !== undefined ? data.is_active : 1
  );

  const row = await db.prepare('SELECT * FROM income_types WHERE id = ?').get(res.lastInsertRowid) as unknown as RawIncomeTypeRow;
  return parseIncomeTypeRow(row);
}

export async function updateIncomeType(
  id: number,
  data: Partial<IncomeStreamDefinition>,
  userId?: number
): Promise<IncomeStreamDefinition | null> {
  const db = getAsyncDb();
  let query = 'SELECT * FROM income_types WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  const existing = await db.prepare(query).get(...params) as unknown as RawIncomeTypeRow | undefined;
  if (!existing) return null;

  const anyData = data as Record<string, unknown>;
  const rawSubcats = data.defaultCategories !== undefined ? data.defaultCategories : anyData.subcategories;
  const subcats = rawSubcats !== undefined ? JSON.stringify(rawSubcats) : existing.subcategories;
  const label = (data.label || anyData.label) as string | undefined;
  const shortLabel = (data.shortLabel || anyData.short_label) as string | undefined;
  const icon = (data.icon || anyData.icon) as string | undefined;
  const color = (data.color || anyData.color) as string | undefined;
  const payerLabel = (data.payerLabel || anyData.payer_label) as string | undefined;
  const payerPlaceholder = (data.payerPlaceholder || anyData.payer_placeholder) as string | undefined;
  const descriptionPlaceholder = (data.descriptionPlaceholder || anyData.description_placeholder) as string | undefined;

  await db.prepare(`
    UPDATE income_types
    SET label = COALESCE(?, label),
        short_label = COALESCE(?, short_label),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        description = ?,
        payer_label = COALESCE(?, payer_label),
        payer_placeholder = COALESCE(?, payer_placeholder),
        description_placeholder = COALESCE(?, description_placeholder),
        subcategories = ?,
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    label || null,
    shortLabel || null,
    icon || null,
    color || null,
    data.description !== undefined ? data.description : existing.description,
    payerLabel || null,
    payerPlaceholder || null,
    descriptionPlaceholder || null,
    subcats,
    data.sort_order !== undefined ? data.sort_order : null,
    data.is_active !== undefined ? data.is_active : null,
    id
  );

  const updated = await db.prepare('SELECT * FROM income_types WHERE id = ?').get(id) as unknown as RawIncomeTypeRow;
  return parseIncomeTypeRow(updated);
}

export async function deleteIncomeType(id: number, userId?: number): Promise<boolean> {
  const db = getAsyncDb();
  let query = 'DELETE FROM income_types WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  const res = await db.prepare(query).run(...params);
  return res.changes > 0;
}

export async function resetIncomeTypes(userId: number): Promise<IncomeStreamDefinition[]> {
  const db = getAsyncDb();
  await db.prepare('DELETE FROM income_types WHERE user_id = ?').run(userId);
  await seedDefaultIncomeTypesForUser(userId);
  return await getIncomeTypes(userId);
}

export async function addIncomeSubcategory(id: number, subcategoryName: string, userId?: number): Promise<IncomeStreamDefinition | null> {
  const db = getAsyncDb();
  let query = 'SELECT * FROM income_types WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  const existing = await db.prepare(query).get(...params) as unknown as RawIncomeTypeRow | undefined;
  if (!existing) return null;

  let currentSubcats: string[] = [];
  if (existing.subcategories) {
    try {
      currentSubcats = JSON.parse(existing.subcategories);
    } catch {
      currentSubcats = [];
    }
  }

  const trimmed = subcategoryName.trim();
  if (trimmed && !currentSubcats.includes(trimmed)) {
    currentSubcats.push(trimmed);
    await db.prepare('UPDATE income_types SET subcategories = ? WHERE id = ?').run(JSON.stringify(currentSubcats), id);
  }

  const updated = await db.prepare('SELECT * FROM income_types WHERE id = ?').get(id) as unknown as RawIncomeTypeRow;
  return parseIncomeTypeRow(updated);
}

export async function removeIncomeSubcategory(id: number, subcategoryName: string, userId?: number): Promise<IncomeStreamDefinition | null> {
  const db = getAsyncDb();
  let query = 'SELECT * FROM income_types WHERE id = ?';
  const params: (string | number)[] = [id];
  if (userId) {
    query += ' AND (user_id = ? OR user_id IS NULL)';
    params.push(userId);
  }
  const existing = await db.prepare(query).get(...params) as unknown as RawIncomeTypeRow | undefined;
  if (!existing) return null;

  let currentSubcats: string[] = [];
  if (existing.subcategories) {
    try {
      currentSubcats = JSON.parse(existing.subcategories);
    } catch {
      currentSubcats = [];
    }
  }

  const filtered = currentSubcats.filter((s) => s !== subcategoryName);
  await db.prepare('UPDATE income_types SET subcategories = ? WHERE id = ?').run(JSON.stringify(filtered), id);

  const updated = await db.prepare('SELECT * FROM income_types WHERE id = ?').get(id) as unknown as RawIncomeTypeRow;
  return parseIncomeTypeRow(updated);
}


