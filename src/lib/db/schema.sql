-- Centensor SQLite Schema

-- 1. Currencies & Exchange Rates
CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    exchange_rate_to_master REAL NOT NULL DEFAULT 1.0,
    decimal_digits INTEGER DEFAULT 2,
    is_master_base INTEGER DEFAULT 0
);

-- 2. Account Books (e.g. Home Land [India], UAE Expenses, US Travel)
CREATE TABLE IF NOT EXISTS account_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL REFERENCES currencies(code),
    description TEXT,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Master Financial Institutions (Banks, Card Issuers)
CREATE TABLE IF NOT EXISTS institutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'IN',
    institution_type TEXT DEFAULT 'bank'
);

-- 4. Accounts (Cash in hand, Bank accounts, Debit Cards, Credit Cards)
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'cash', 'bank', 'debit_card', 'credit_card', 'voucher'
    currency_code TEXT NOT NULL REFERENCES currencies(code),
    account_number_last4 TEXT,
    opening_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    billing_cycle_day INTEGER,
    is_active INTEGER DEFAULT 1
);

-- 4.5. Main Heads (General Ledger Categories Groups / Macro Heads)
CREATE TABLE IF NOT EXISTS category_heads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 5. Sub Heads (General Ledger Specific Categories)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    head_id INTEGER REFERENCES category_heads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 6. Monthly Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- 'YYYY-MM'
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount REAL DEFAULT 0,
    UNIQUE(book_id, month, category_id)
);

-- 7. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- 'YYYY-MM-DD'
    amount REAL NOT NULL,
    currency_code TEXT NOT NULL REFERENCES currencies(code),
    exchange_rate_to_master REAL NOT NULL DEFAULT 1.0,
    amount_master_currency REAL NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL, -- 'cash', 'debit_card', 'credit_card'
    type TEXT NOT NULL, -- 'expense', 'income', 'bank_withdrawal', 'card_settlement', 'transfer'
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    description TEXT,
    merchant TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. Daily Reconciliations (EOD Cash)
CREATE TABLE IF NOT EXISTS daily_reconciliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
    date TEXT NOT NULL, -- 'YYYY-MM-DD'
    eod_cash_actual REAL,
    eod_cash_computed REAL DEFAULT 0,
    notes TEXT,
    UNIQUE(book_id, date)
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_tx_book_date ON transactions(book_id, date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_book_month ON budgets(book_id, month);
