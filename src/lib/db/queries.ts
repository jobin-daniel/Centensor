import { getDb } from './client';
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
} from '../types';
import { getDaysInMonth, getMonthName, isWeekend, isCurrentDay, formatDateISO, getDayOfWeekAbbr } from '../formatters';

// --- Master Currencies ---
export function getCurrencies(): Currency[] {
  const db = getDb();
  return db.prepare('SELECT * FROM currencies ORDER BY is_master_base DESC, code ASC').all() as unknown as Currency[];
}

export function getMasterCurrency(): Currency {
  const db = getDb();
  const row = db.prepare('SELECT * FROM currencies WHERE is_master_base = 1').get() as unknown as Currency;
  if (row) return row;
  return { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchange_rate_to_master: 1.0, decimal_digits: 2, is_master_base: 1 };
}

export function updateCurrencyRate(code: string, rate: number): void {
  const db = getDb();
  db.prepare('UPDATE currencies SET exchange_rate_to_master = ? WHERE code = ?').run(rate, code);
}

export function setMasterCurrency(code: string): void {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE currencies SET is_master_base = 0').run();
    db.prepare('UPDATE currencies SET is_master_base = 1, exchange_rate_to_master = 1.0 WHERE code = ?').run(code);
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

// --- Account Books ---
export function getAccountBooks(): AccountBook[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.*, c.symbol as currency_symbol
    FROM account_books b
    LEFT JOIN currencies c ON b.currency_code = c.code
    ORDER BY b.is_default DESC, b.sort_order ASC, b.name ASC
  `).all() as unknown as AccountBook[];
  return rows;
}

export function getAccountBookById(id: number): AccountBook | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT b.*, c.symbol as currency_symbol
    FROM account_books b
    LEFT JOIN currencies c ON b.currency_code = c.code
    WHERE b.id = ?
  `).get(id) as unknown as AccountBook;
  return row || null;
}

export function createAccountBook(data: { name: string; currency_code: string; description?: string }): AccountBook {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO account_books (name, currency_code, description, is_default, sort_order)
    VALUES (?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM account_books))
  `).run(data.name, data.currency_code, data.description || null);
  
  const newId = Number(res.lastInsertRowid);
  // Create default cash account for this book
  createAccount({
    book_id: newId,
    name: `Cash in Hand (${data.currency_code})`,
    type: 'cash',
    currency_code: data.currency_code,
    opening_balance: 0,
  });

  return getAccountBookById(newId)!;
}

// --- Institutions ---
export function getInstitutions(): Institution[] {
  const db = getDb();
  return db.prepare('SELECT * FROM institutions ORDER BY country_code, name').all() as unknown as Institution[];
}

export function createInstitution(data: { name: string; country_code: string; institution_type?: string }): Institution {
  const db = getDb();
  const res = db.prepare(`
    INSERT INTO institutions (name, country_code, institution_type)
    VALUES (?, ?, ?)
  `).run(data.name, data.country_code, data.institution_type || 'bank');
  return db.prepare('SELECT * FROM institutions WHERE id = ?').get(res.lastInsertRowid) as unknown as Institution;
}

// --- Accounts ---
export function getAccounts(bookId?: number): Account[] {
  const db = getDb();
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
  query += ' ORDER BY a.type ASC, a.name ASC';
  return db.prepare(query).all(...params) as unknown as Account[];
}

export function createAccount(data: {
  book_id: number;
  institution_id?: number | null;
  name: string;
  type: string;
  currency_code: string;
  account_number_last4?: string | null;
  opening_balance?: number;
  credit_limit?: number;
  billing_cycle_day?: number | null;
}): Account {
  const db = getDb();
  const opening = data.opening_balance || 0;
  const res = db.prepare(`
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

  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(res.lastInsertRowid) as unknown as Account;
}

// --- Categories, Main Heads & Budgets ---

export function getCategories(bookId?: number, monthStr?: string): Category[] {
  const db = getDb();
  const query = `
    SELECT 
      c.id, c.head_id, c.name, c.group_name, c.icon, c.color, c.sort_order,
      h.name as head_name, h.icon as head_icon,
      b.amount as monthly_budget
    FROM categories c
    LEFT JOIN category_heads h ON c.head_id = h.id
    LEFT JOIN budgets b ON c.id = b.category_id AND b.book_id = ? AND b.month = ?
    ORDER BY COALESCE(h.sort_order, 999) ASC, c.sort_order ASC, c.name ASC
  `;
  const rows = db.prepare(query).all(bookId || 0, monthStr || '') as unknown as Category[];
  return rows;
}

export function getCategoryHeads(): CategoryHead[] {
  const db = getDb();
  const heads = db.prepare(`
    SELECT * FROM category_heads ORDER BY sort_order ASC, name ASC
  `).all() as unknown as CategoryHead[];

  const categories = getCategories();

  for (const h of heads) {
    h.sub_heads = categories.filter((c) => c.head_id === h.id || c.group_name === h.name);
    h.sub_categories_count = h.sub_heads.length;
  }

  return heads;
}

export function getCategoryHeadById(id: number): CategoryHead | null {
  const db = getDb();
  const head = db.prepare('SELECT * FROM category_heads WHERE id = ?').get(id) as unknown as CategoryHead | undefined;
  if (!head) return null;
  const categories = getCategories();
  head.sub_heads = categories.filter((c) => c.head_id === head.id || c.group_name === head.name);
  head.sub_categories_count = head.sub_heads.length;
  return head;
}

export function createCategoryHead(data: { name: string; icon?: string; color?: string; sort_order?: number }): CategoryHead {
  const db = getDb();
  const nextOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM category_heads').get() as { next_order: number };
  const sortOrder = data.sort_order ?? nextOrderRow.next_order;

  const res = db.prepare(`
    INSERT INTO category_heads (name, icon, color, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(data.name.trim(), data.icon || '📁', data.color || '#6366F1', sortOrder);

  return getCategoryHeadById(Number(res.lastInsertRowid))!;
}

export function updateCategoryHead(id: number, data: { name: string; icon?: string; color?: string; sort_order?: number }): CategoryHead {
  const db = getDb();
  const oldHead = db.prepare('SELECT * FROM category_heads WHERE id = ?').get(id) as { name: string } | undefined;
  const newName = data.name.trim();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE category_heads 
      SET name = ?, icon = ?, color = ?, sort_order = ?
      WHERE id = ?
    `).run(newName, data.icon || '📁', data.color || '#6366F1', data.sort_order ?? 0, id);

    // Keep categories.group_name in sync
    if (oldHead && oldHead.name !== newName) {
      db.prepare('UPDATE categories SET group_name = ? WHERE head_id = ? OR group_name = ?').run(newName, id, oldHead.name);
    }

    db.exec('COMMIT;');
    return getCategoryHeadById(id)!;
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function deleteCategoryHead(id: number, cascade: boolean = false): void {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    if (cascade) {
      const subHeads = db.prepare('SELECT id FROM categories WHERE head_id = ?').all(id) as { id: number }[];
      for (const s of subHeads) {
        db.prepare('DELETE FROM budgets WHERE category_id = ?').run(s.id);
        db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(s.id);
        db.prepare('DELETE FROM categories WHERE id = ?').run(s.id);
      }
    } else {
      db.prepare('UPDATE categories SET head_id = NULL WHERE head_id = ?').run(id);
    }

    db.prepare('DELETE FROM category_heads WHERE id = ?').run(id);
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function createCategory(data: {
  head_id?: number | null;
  name: string;
  group_name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  monthly_budget?: number;
}): Category {
  const db = getDb();
  let groupName = data.group_name || 'Other';
  let icon = data.icon;
  let color = data.color;

  if (data.head_id) {
    const head = db.prepare('SELECT name, icon, color FROM category_heads WHERE id = ?').get(data.head_id) as { name: string; icon?: string; color?: string } | undefined;
    if (head) {
      groupName = head.name;
      if (!icon) icon = head.icon;
      if (!color) color = head.color;
    }
  }

  const nextOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM categories').get() as { next_order: number };
  const sortOrder = data.sort_order ?? nextOrderRow.next_order;

  const res = db.prepare(`
    INSERT INTO categories (head_id, name, group_name, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.head_id || null, data.name.trim(), groupName, icon || '🏷️', color || '#6366F1', sortOrder);

  const newId = Number(res.lastInsertRowid);
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(newId) as unknown as Category;
}

export function updateCategory(id: number, data: {
  head_id?: number | null;
  name?: string;
  group_name?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  monthly_budget?: number;
}): Category {
  const db = getDb();
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as unknown as Category | undefined;
  if (!current) throw new Error('Category not found');

  const headId = data.head_id !== undefined ? data.head_id : current.head_id;
  let groupName = data.group_name || current.group_name;

  if (headId) {
    const head = db.prepare('SELECT name, icon, color FROM category_heads WHERE id = ?').get(headId) as { name: string; icon?: string; color?: string } | undefined;
    if (head) {
      groupName = head.name;
    }
  }

  db.prepare(`
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

  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as unknown as Category;
}

export function deleteCategory(id: number): { success: boolean; transactionsCount: number } {
  const db = getDb();
  const txCount = (db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number })?.count ?? 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    if (txCount > 0) {
      db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(id);
    }
    db.prepare('DELETE FROM budgets WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.exec('COMMIT;');
    return { success: true, transactionsCount: txCount };
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function resetCategoriesToDefault(): void {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE transactions SET category_id = NULL').run();
    db.prepare('DELETE FROM budgets').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM category_heads').run();

    const insertHead = db.prepare(`
      INSERT INTO category_heads (name, icon, color, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    const insertSub = db.prepare(`
      INSERT INTO categories (head_id, name, group_name, icon, color, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const head of SEED_CATEGORY_HEADS) {
      const res = insertHead.run(head.name, head.icon, head.color, head.sort_order);
      const headId = Number(res.lastInsertRowid);
      for (const sub of head.sub_heads) {
        insertSub.run(headId, sub.name, head.name, sub.icon || head.icon, sub.color || head.color, sub.sort_order);
      }
    }

    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function setCategoryBudget(bookId: number, categoryId: number, month: string, amount: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO budgets (book_id, month, category_id, amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(book_id, month, category_id) DO UPDATE SET amount = excluded.amount
  `).run(bookId, month, categoryId, amount);
}

// --- Transactions ---
export function createTransaction(data: {
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
}): Transaction {
  const db = getDb();
  const account = db.prepare('SELECT currency_code FROM accounts WHERE id = ?').get(data.account_id) as { currency_code: string };
  const currencyCode = account?.currency_code || 'INR';
  
  // Get current conversion rate to master
  const curr = db.prepare('SELECT exchange_rate_to_master FROM currencies WHERE code = ?').get(currencyCode) as { exchange_rate_to_master: number };
  const rate = curr?.exchange_rate_to_master || 1.0;
  const masterAmount = data.amount * rate;
  const type = data.type || 'expense';

  db.exec('BEGIN TRANSACTION;');
  try {
    const res = db.prepare(`
      INSERT INTO transactions (
        book_id, date, amount, currency_code, exchange_rate_to_master,
        amount_master_currency, category_id, account_id, payment_method,
        type, to_account_id, description, merchant, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.notes || null
    );

    // Update account balances based on type
    if (type === 'expense') {
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
    } else if (type === 'income') {
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.account_id);
    } else if (type === 'bank_withdrawal') {
      // Transfer from Bank account to Cash in hand
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
      if (data.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.to_account_id);
      }
    } else if (type === 'card_settlement') {
      // Bank pays credit card
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.account_id);
      if (data.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.to_account_id);
      }
    }

    db.exec('COMMIT;');
    const newTxId = Number(res.lastInsertRowid);
    return getTransactionById(newTxId)!;
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function getTransactionById(id: number): Transaction | null {
  const db = getDb();
  const row = db.prepare(`
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
  `).get(id) as unknown as Transaction;
  return row || null;
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  const tx = getTransactionById(id);
  if (!tx) return;

  db.exec('BEGIN TRANSACTION;');
  try {
    // Revert account balance effects
    if (tx.type === 'expense') {
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
    } else if (tx.type === 'income') {
      db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.account_id);
    } else if (tx.type === 'bank_withdrawal' || tx.type === 'card_settlement') {
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      if (tx.to_account_id) {
        db.prepare('UPDATE accounts SET current_balance = current_balance - ? WHERE id = ?').run(tx.amount, tx.to_account_id);
      }
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export function getTransactions(filter: {
  book_id?: number;
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD
  category_id?: number;
  payment_method?: string;
  limit?: number;
}): Transaction[] {
  const db = getDb();
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
  if (filter.payment_method) {
    query += ' AND t.payment_method = ?';
    params.push(filter.payment_method);
  }

  query += ' ORDER BY t.date DESC, t.id DESC';
  if (filter.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  return db.prepare(query).all(...params) as unknown as Transaction[];
}

// --- Monthly Worksheet Matrix Engine ---
export function getMonthlyWorksheetData(bookId: number, year: number, month: number): MonthlyWorksheetData {
  const db = getDb();
  const book = getAccountBookById(bookId) || getAccountBooks()[0];
  const masterCurrency = getMasterCurrency();
  const daysInMonth = getDaysInMonth(year, month);
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = getMonthName(month);

  // 1. Get Categories and Budgets
  const categories = getCategories(book.id, monthStr);
  const categoriesMap = new Map<number, Category>();
  categories.forEach(c => categoriesMap.set(c.id, c));

  // 2. Fetch all transactions for this month and book
  const transactions = getTransactions({
    book_id: book.id,
    month: monthStr,
  });

  // 3. Find opening cash for this book at beginning of month
  // Check cash account opening balance + net cash transactions prior to this month
  const cashAccount = db.prepare(`
    SELECT id, opening_balance FROM accounts
    WHERE book_id = ? AND type = 'cash' LIMIT 1
  `).get(book.id) as { id: number; opening_balance: number } | undefined;

  let runningCashBalance = cashAccount?.opening_balance || 0;
  if (cashAccount) {
    const priorCashFlow = db.prepare(`
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

  // 9. Group rows by category group_name
  const categoriesByGroup: { [group: string]: CategoryWorksheetRow[] } = {};
  for (const row of categoryRowsMap.values()) {
    const grp = row.category.group_name || 'Other';
    if (!categoriesByGroup[grp]) {
      categoriesByGroup[grp] = [];
    }
    categoriesByGroup[grp].push(row);
  }

  return {
    year,
    month,
    monthName,
    daysInMonth,
    book,
    masterCurrency,
    categoriesByGroup,
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
  };
}

// --- Consolidated Master Book Data Engine ---
export function getConsolidatedMasterBookData(year: number, month: number): ConsolidatedMasterBookData {
  const db = getDb();
  const masterCurrency = getMasterCurrency();
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthName = getMonthName(month);

  const books = getAccountBooks();
  const bookSummaries: ConsolidatedMasterBookData['books'] = [];

  let grandTotalMaster = 0;

  for (const b of books) {
    const txs = db.prepare(`
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
  const catRows = db.prepare(`
    SELECT 
      c.id, c.name, c.group_name, c.icon, c.color, c.sort_order,
      COALESCE(SUM(t.amount_master_currency), 0) as total_master
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.date LIKE ? AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY total_master DESC
  `).all(`${monthStr}%`) as unknown as (Category & { total_master: number })[];

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
    const mTotal = db.prepare(`
      SELECT COALESCE(SUM(amount_master_currency), 0) as total
      FROM transactions
      WHERE date LIKE ? AND type = 'expense'
    `).get(mPrefix) as { total: number };

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

export function getExpenseDashboardData(params: {
  bookId?: number | 'all';
  year?: number;
  month?: number;
  period?: 'month' | 'year' | 'all';
}): ExpenseDashboardData {
  const db = getDb();
  const masterCurrency = getMasterCurrency();
  const books = getAccountBooks();

  const isConsolidated = params.bookId === 'all';
  const selectedBookId = isConsolidated ? null : (params.bookId || books[0]?.id || 1);
  const activeBook = !isConsolidated ? (books.find(b => b.id === selectedBookId) || books[0]) : null;

  // Determine available years from database
  const yrRows = db.prepare(`
    SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) as yr
    FROM transactions
    WHERE type = 'expense'
    ORDER BY yr DESC
  `).all() as { yr: number }[];

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

  const currentSummaryRow = db.prepare(`
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

    const prevRow = db.prepare(`
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
    const prevRow = db.prepare(`
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
    const budgetRow = db.prepare(`
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
  const catRows = db.prepare(catQuery).all(...currentParams) as {
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

  const categoryBreakdown: CategoryExpenseBreakdown[] = catRows.map(r => {
    const pct = totalExpenses > 0 ? (r.total_amount / totalExpenses) * 100 : 0;
    const avg = r.count > 0 ? r.total_amount / r.count : 0;
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
      budget: 0,
      variance: 0,
    };
  });

  // 4b. Category Heads Breakdown (Tata Neu Super-App Launcher)
  const allHeads = getCategoryHeads();
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
    const mRow = db.prepare(`
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
    const dRow = db.prepare(`
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
  const wdRows = db.prepare(`
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
  const pmRows = db.prepare(`
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
  const accRows = db.prepare(`
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
  const topRows = db.prepare(`
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
