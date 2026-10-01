import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { SEED_CURRENCIES, SEED_BOOKS, SEED_INSTITUTIONS, SEED_CATEGORIES, SEED_CATEGORY_HEADS } from './seeds';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

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

  // Initialize schema
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Ensure category_heads and categories migration
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS category_heads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0
      );
    `);
    const catCols = db.prepare("PRAGMA table_info(categories)").all() as { name: string }[];
    if (!catCols.some((c) => c.name === 'head_id')) {
      db.exec("ALTER TABLE categories ADD COLUMN head_id INTEGER REFERENCES category_heads(id) ON DELETE SET NULL;");
    }
  } catch (e) {
    console.error('Migration error:', e);
  }

  // Seed default data if empty
  seedInitialData(db);

  dbInstance = db;
  return dbInstance;
}

function seedInitialData(db: DatabaseSync) {
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

  // Check if books exist
  const bookCount = (db.prepare('SELECT COUNT(*) as count FROM account_books').get() as { count: number })?.count ?? 0;
  if (bookCount === 0) {
    const insertBook = db.prepare(`
      INSERT INTO account_books (name, currency_code, description, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const b of SEED_BOOKS) {
      insertBook.run(b.name, b.currency_code, b.description, b.is_default, b.sort_order);
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

  // Check if accounts exist
  const accCount = (db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number })?.count ?? 0;
  if (accCount === 0) {
    const books = db.prepare('SELECT id, name, currency_code FROM account_books').all() as { id: number; name: string; currency_code: string }[];
    const insts = db.prepare('SELECT id, name FROM institutions').all() as { id: number; name: string }[];
    
    const hdfc = insts.find(i => i.name.includes('HDFC'))?.id ?? null;
    const sbi = insts.find(i => i.name.includes('State Bank'))?.id ?? null;
    const enbd = insts.find(i => i.name.includes('Emirates NBD'))?.id ?? null;
    const chase = insts.find(i => i.name.includes('Chase'))?.id ?? null;

    const homeBook = books.find(b => b.name.includes('Home Land'))?.id;
    const uaeBook = books.find(b => b.name.includes('UAE'))?.id;
    const usBook = books.find(b => b.name.includes('US'))?.id;

    const insertAcc = db.prepare(`
      INSERT INTO accounts (book_id, institution_id, name, type, currency_code, account_number_last4, opening_balance, current_balance, credit_limit, billing_cycle_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (homeBook) {
      insertAcc.run(homeBook, null, 'Cash in Hand (INR)', 'cash', 'INR', null, 5000, 5000, 0, null);
      insertAcc.run(homeBook, hdfc, 'HDFC Bank Savings', 'bank', 'INR', '4821', 50000, 50000, 0, null);
      insertAcc.run(homeBook, sbi, 'SBI Account', 'bank', 'INR', '1092', 25000, 25000, 0, null);
      insertAcc.run(homeBook, hdfc, 'HDFC Credit Card', 'credit_card', 'INR', '8812', 0, 0, 150000, 15);
    }

    if (uaeBook) {
      insertAcc.run(uaeBook, null, 'Cash in Hand (AED)', 'cash', 'AED', null, 1000, 1000, 0, null);
      insertAcc.run(uaeBook, enbd, 'Emirates NBD Current', 'bank', 'AED', '7731', 12000, 12000, 0, null);
      insertAcc.run(uaeBook, enbd, 'ENBD Credit Card', 'credit_card', 'AED', '3304', 0, 0, 25000, 1);
    }

    if (usBook) {
      insertAcc.run(usBook, null, 'Cash in Hand (USD)', 'cash', 'USD', null, 500, 500, 0, null);
      insertAcc.run(usBook, chase, 'Chase Sapphire Card', 'credit_card', 'USD', '9120', 0, 0, 8000, 20);
    }
  }

  // Check if category heads & categories exist
  const headCount = (db.prepare('SELECT COUNT(*) as count FROM category_heads').get() as { count: number })?.count ?? 0;
  const txCount = (db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number })?.count ?? 0;

  if (headCount === 0) {
    if (txCount === 0) {
      // Safe to replace placeholder categories with the recommended Main Heads and Sub Heads
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
    } else {
      // If transactions exist, migrate existing groups into category_heads
      const distinctGroups = db.prepare('SELECT DISTINCT group_name FROM categories WHERE group_name IS NOT NULL').all() as { group_name: string }[];
      const insertHead = db.prepare('INSERT OR IGNORE INTO category_heads (name, icon, color, sort_order) VALUES (?, ?, ?, ?)');
      let order = 1;
      for (const g of distinctGroups) {
        insertHead.run(g.group_name, '📁', '#6366F1', order++);
        const headRow = db.prepare('SELECT id FROM category_heads WHERE name = ?').get(g.group_name) as { id: number } | undefined;
        if (headRow) {
          db.prepare('UPDATE categories SET head_id = ? WHERE group_name = ?').run(headRow.id, g.group_name);
        }
      }
    }
  }
}
