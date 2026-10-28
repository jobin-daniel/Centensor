import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { SEED_CURRENCIES, SEED_INSTITUTIONS } from './seeds';

let dbInstance: DatabaseSync | null = null;

export function isCloudflare(): boolean {
  return (
    typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    process.env.CF_PAGES === '1' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    Boolean((globalThis as any).DB) ||
    Boolean((process.env as any).DB) ||
    Boolean((globalThis as any).__CF_PAGES_CTX__)
  );
}

export function getD1(): any {
  if (typeof (globalThis as any).DB !== 'undefined') {
    return (globalThis as any).DB;
  }
  if (typeof (process.env as any).DB !== 'undefined') {
    return (process.env as any).DB;
  }
  if (typeof (globalThis as any).__CF_PAGES_CTX__?.env?.DB !== 'undefined') {
    return (globalThis as any).__CF_PAGES_CTX__.env.DB;
  }
  if (typeof (globalThis as any).__env__?.DB !== 'undefined') {
    return (globalThis as any).__env__.DB;
  }
  try {
    const globalContext = (globalThis as any).__CF_PAGES_CTX__ || (globalThis as any).__openNextContext;
    if (globalContext?.env?.DB) return globalContext.env.DB;
  } catch {
    // Ignore if not present
  }
  return null;
}

export interface AsyncDb {
  all<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  get<T = any>(sql: string, ...params: any[]): Promise<T | null>;
  run(sql: string, ...params: any[]): Promise<{ changes: number; lastInsertRowid: number }>;
  exec(sql: string): Promise<void>;
  prepare(sql: string): {
    all<T = any>(...params: any[]): Promise<T[]>;
    get<T = any>(...params: any[]): Promise<T | null>;
    run(...params: any[]): Promise<{ changes: number; lastInsertRowid: number }>;
  };
}

export function getAsyncDb(): AsyncDb {
  const d1 = getD1();
  if (d1) {
    return {
      async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
        const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
        const res = await stmt.all();
        return (res.results || []) as T[];
      },
      async get<T = any>(sql: string, ...params: any[]): Promise<T | null> {
        const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
        const row = await stmt.first();
        return (row ?? null) as T | null;
      },
      async run(sql: string, ...params: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
        const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
        const res = await stmt.run();
        return {
          changes: Number(res.meta?.changes ?? 0),
          lastInsertRowid: Number(res.meta?.last_row_id ?? 0),
        };
      },
      async exec(sql: string): Promise<void> {
        await d1.exec(sql);
      },
      prepare(sql: string) {
        return {
          async all<T = any>(...params: any[]): Promise<T[]> {
            const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
            const res = await stmt.all();
            return (res.results || []) as T[];
          },
          async get<T = any>(...params: any[]): Promise<T | null> {
            const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
            const row = await stmt.first();
            return (row ?? null) as T | null;
          },
          async run(...params: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
            const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
            const res = await stmt.run();
            return {
              changes: Number(res.meta?.changes ?? 0),
              lastInsertRowid: Number(res.meta?.last_row_id ?? 0),
            };
          },
        };
      },
    };
  }

  // Local SQLite fallback (Node.js runtime)
  const localDb = getDb();
  return {
    async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
      return localDb.prepare(sql).all(...params) as T[];
    },
    async get<T = any>(sql: string, ...params: any[]): Promise<T | null> {
      const row = localDb.prepare(sql).get(...params);
      return (row ?? null) as T | null;
    },
    async run(sql: string, ...params: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
      const res = localDb.prepare(sql).run(...params);
      return {
        changes: Number(res.changes),
        lastInsertRowid: Number(res.lastInsertRowid),
      };
    },
    async exec(sql: string): Promise<void> {
      localDb.exec(sql);
    },
    prepare(sql: string) {
      const stmt = localDb.prepare(sql);
      return {
        async all<T = any>(...params: any[]): Promise<T[]> {
          return stmt.all(...params) as T[];
        },
        async get<T = any>(...params: any[]): Promise<T | null> {
          const row = stmt.get(...params);
          return (row ?? null) as T | null;
        },
        async run(...params: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
          const res = stmt.run(...params);
          return {
            changes: Number(res.changes),
            lastInsertRowid: Number(res.lastInsertRowid),
          };
        },
      };
    },
  };
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  // Guard against filesystem operations on Cloudflare Workers
  if (isCloudflare()) {
    try {
      // In-memory fallback if sync getDb() is invoked on edge
      const inMemoryDb = new DatabaseSync(':memory:');
      return inMemoryDb;
    } catch {
      // Return a safe mock object to prevent crash
      return {
        exec: () => {},
        prepare: () => ({ all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: 0 }) }),
        close: () => {},
      } as unknown as DatabaseSync;
    }
  }

  try {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'centensor.db');
    const legacyDbPath = path.join(dbDir, 'wise_expenso.db');
    const activeDbPath = fs.existsSync(dbPath) ? dbPath : (fs.existsSync(legacyDbPath) ? legacyDbPath : dbPath);
    const db = new DatabaseSync(activeDbPath);

    // Enable WAL mode & foreign keys for performance and integrity
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    // Ensure migrations for multi-tenant SaaS
    runTenantMigrations(db);

    // Initialize schema
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    }

    // Seed shared master data (currencies, institutions)
    seedMasterData(db);

    dbInstance = db;
    return dbInstance;
  } catch (err) {
    console.warn('Local SQLite initialization bypassed (read-only filesystem):', err);
    return new DatabaseSync(':memory:');
  }
}


function runTenantMigrations(db: DatabaseSync) {
  try {
    // 1. Ensure users table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT,
        image TEXT,
        tier TEXT DEFAULT 'pro',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Check and add user_id to account_books
    const bookCols = db.prepare("PRAGMA table_info(account_books)").all() as { name: string }[];
    if (!bookCols.some((c) => c.name === 'user_id')) {
      db.exec("ALTER TABLE account_books ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
    }

    // 3. Check and add user_id to category_heads
    const headCols = db.prepare("PRAGMA table_info(category_heads)").all() as { name: string }[];
    if (!headCols.some((c) => c.name === 'user_id')) {
      db.exec("ALTER TABLE category_heads ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
    }

    // 4. Check and add user_id to categories
    const catCols = db.prepare("PRAGMA table_info(categories)").all() as { name: string }[];
    if (!catCols.some((c) => c.name === 'user_id')) {
      db.exec("ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;");
    }
    if (!catCols.some((c) => c.name === 'head_id')) {
      db.exec("ALTER TABLE categories ADD COLUMN head_id INTEGER REFERENCES category_heads(id) ON DELETE SET NULL;");
    }

    // 5. Seed default demo user if no users exist
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number })?.count ?? 0;
    let defaultUserId: number = 1;
    if (userCount === 0) {
      const demoHash = bcrypt.hashSync('Password123!', 10);
      const res = db.prepare(`
        INSERT INTO users (name, email, password_hash, tier)
        VALUES (?, ?, ?, 'pro')
      `).run('Demo Admin', 'demo@centensor.com', demoHash);
      defaultUserId = Number(res.lastInsertRowid);
    } else {
      const firstUser = db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get() as { id: number };
      defaultUserId = firstUser.id;
    }

    // Link any orphaned account_books / categories to default user
    db.prepare('UPDATE account_books SET user_id = ? WHERE user_id IS NULL').run(defaultUserId);
    db.prepare('UPDATE category_heads SET user_id = ? WHERE user_id IS NULL').run(defaultUserId);
    db.prepare('UPDATE categories SET user_id = ? WHERE user_id IS NULL').run(defaultUserId);

    // 6. Ensure monthly_worksheet_heads and monthly_worksheet_categories tables exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_worksheet_heads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        head_id INTEGER NOT NULL REFERENCES category_heads(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, month, head_id)
      );

      CREATE TABLE IF NOT EXISTS monthly_worksheet_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id, month, category_id)
      );

      CREATE INDEX IF NOT EXISTS idx_monthly_ws_heads ON monthly_worksheet_heads(user_id, book_id, month);
      CREATE INDEX IF NOT EXISTS idx_monthly_ws_cats ON monthly_worksheet_categories(user_id, book_id, month);

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'income',
        to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency_code TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'monthly',
        day_of_month INTEGER DEFAULT 1,
        day_of_week INTEGER DEFAULT 1,
        start_date TEXT NOT NULL,
        end_date TEXT,
        last_processed_date TEXT,
        next_due_date TEXT,
        payer_merchant TEXT,
        description TEXT,
        auto_post INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_book ON recurring_transactions(book_id);
    `);

    // 7. Ensure transactions table has income_type, income_category, repayment_due_date, repayment_status
    const txCols = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
    if (!txCols.some((c) => c.name === 'income_type')) {
      db.exec("ALTER TABLE transactions ADD COLUMN income_type TEXT;");
    }
    if (!txCols.some((c) => c.name === 'income_category')) {
      db.exec("ALTER TABLE transactions ADD COLUMN income_category TEXT;");
    }
    if (!txCols.some((c) => c.name === 'repayment_due_date')) {
      db.exec("ALTER TABLE transactions ADD COLUMN repayment_due_date TEXT;");
    }
    if (!txCols.some((c) => c.name === 'repayment_status')) {
      db.exec("ALTER TABLE transactions ADD COLUMN repayment_status TEXT DEFAULT 'pending';");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tx_income ON transactions(type, income_type);");

    // 8. Ensure income_types table exists for user-configurable income streams
    db.exec(`
      CREATE TABLE IF NOT EXISTS income_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type_key TEXT NOT NULL,
        label TEXT NOT NULL,
        short_label TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        payer_label TEXT DEFAULT 'Payer / Source',
        payer_placeholder TEXT DEFAULT 'e.g. Source name',
        description_placeholder TEXT DEFAULT 'e.g. Income details',
        subcategories TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type_key)
      );
      CREATE INDEX IF NOT EXISTS idx_income_types_user ON income_types(user_id, sort_order);
    `);
  } catch (e) {
    console.error('Tenant migration error:', e);
  }
}

function seedMasterData(db: DatabaseSync) {
  // Check if currencies exist
  const currCount = (db.prepare('SELECT COUNT(*) as count FROM currencies').get() as { count: number })?.count ?? 0;
  if (currCount === 0) {
    const insertCurr = db.prepare(`
      INSERT INTO currencies (code, symbol, name, exchange_rate_to_master, decimal_digits, is_master_base)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const c of SEED_CURRENCIES) {
      insertCurr.run(c.code, c.symbol, c.name, c.exchange_rate_to_master, c.decimal_digits, c.is_master_base);
    }
  }

  // Check if institutions exist
  const instCount = (db.prepare('SELECT COUNT(*) as count FROM institutions').get() as { count: number })?.count ?? 0;
  if (instCount === 0) {
    const insertInst = db.prepare(`
      INSERT INTO institutions (name, country_code, institution_type)
      VALUES (?, ?, ?)
    `);
    for (const inst of SEED_INSTITUTIONS) {
      insertInst.run(inst.name, inst.country_code, inst.institution_type);
    }
  }
}
