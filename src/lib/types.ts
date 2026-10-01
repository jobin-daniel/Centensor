export type CurrencyCode = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP' | string;

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchange_rate_to_master: number; // e.g. 1 AED = 22.7 INR, or 1 USD = 83 INR
  decimal_digits: number;
  is_master_base: number; // 1 if this is the primary consolidated reporting currency
}

export interface AccountBook {
  id: number;
  name: string; // e.g. "Home Land (India)", "UAE Expenses", "US Travel"
  currency_code: CurrencyCode;
  currency_symbol?: string;
  description?: string;
  is_default: number;
  sort_order: number;
  created_at: string;
}

export type InstitutionType = 'bank' | 'fintech' | 'card_issuer';

export interface Institution {
  id: number;
  name: string; // e.g. "HDFC Bank", "State Bank of India", "Emirates NBD", "Chase"
  country_code: string; // "IN", "AE", "US"
  institution_type: InstitutionType;
}

export type AccountType = 'cash' | 'bank' | 'debit_card' | 'credit_card' | 'voucher';

export interface Account {
  id: number;
  book_id: number;
  book_name?: string;
  institution_id?: number | null;
  institution_name?: string;
  name: string; // e.g. "Cash in Hand (INR)", "HDFC Savings", "ENBD Current", "HDFC Regalia"
  type: AccountType;
  currency_code: CurrencyCode;
  currency_symbol?: string;
  account_number_last4?: string;
  opening_balance: number;
  current_balance: number;
  credit_limit?: number; // For credit cards
  billing_cycle_day?: number; // For credit cards
  is_active: number;
}

export interface CategoryHead {
  id: number;
  name: string; // e.g. "🍔 Food / Eating out", "🚗 Car / Transport", "🏠 House"
  icon?: string; // Emoji e.g. "🍔" or Lucide icon name
  color?: string; // Hex color code
  sort_order: number;
  sub_categories_count?: number;
  sub_heads?: Category[];
}

export interface Category {
  id: number;
  head_id?: number | null; // Foreign key to CategoryHead
  head_name?: string; // Main Head name
  head_icon?: string; // Main Head emoji / icon
  name: string; // Sub Head name: e.g. "Groceries", "Restaurants", "Fast food"
  group_name: string; // Main Head name (kept in sync for backward compatibility)
  icon?: string;
  color?: string;
  sort_order: number;
  monthly_budget?: number; // Active book budget
}

export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card';

export type TransactionType = 
  | 'expense' 
  | 'income' 
  | 'bank_withdrawal'   // Transfer from Bank to Cash in Hand
  | 'card_settlement'   // Paying credit card bill from Bank
  | 'transfer';         // Generic transfer between accounts/books

export interface Transaction {
  id: number;
  book_id: number;
  book_name?: string;
  date: string; // YYYY-MM-DD
  amount: number; // in local book currency
  currency_code: CurrencyCode;
  currency_symbol?: string;
  exchange_rate_to_master: number;
  amount_master_currency: number;
  category_id?: number | null;
  category_name?: string;
  category_group?: string;
  category_color?: string;
  account_id: number;
  account_name?: string;
  account_type?: AccountType;
  payment_method: PaymentMethod;
  type: TransactionType;
  to_account_id?: number | null;
  to_account_name?: string;
  description?: string;
  merchant?: string;
  notes?: string;
  created_at: string;
}

export interface Budget {
  id: number;
  book_id: number;
  month: string; // YYYY-MM
  category_id: number;
  amount: number;
}

export interface DailyReconciliation {
  id: number;
  book_id: number;
  date: string; // YYYY-MM-DD
  eod_cash_actual?: number;
  eod_cash_computed: number;
  notes?: string;
}

// Matrix cell for the 31-day worksheet view
export interface MatrixCellData {
  categoryId: number;
  day: number; // 1 to 31
  date: string; // YYYY-MM-DD
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
  hasCash: boolean;
  hasDebit: boolean;
  hasCredit: boolean;
}

export interface CategoryWorksheetRow {
  category: Category;
  cells: { [day: number]: MatrixCellData };
  monthTotal: number;
  budget: number;
  variance: number; // budget - monthTotal (positive = under budget)
  percentOfTotal: number;
}

export interface DailySummary {
  day: number;
  date: string;
  cashSpent: number;
  cardSpent: number; // debit + credit
  grandTotal: number;
  bankWithdrawal: number;
  eodCashComputed: number;
  eodCashActual?: number;
  isToday: boolean;
  isWeekend: boolean;
}

export interface MonthlyWorksheetData {
  year: number;
  month: number; // 1 to 12
  monthName: string;
  daysInMonth: number;
  book: AccountBook;
  masterCurrency: Currency;
  categoriesByGroup: { [group: string]: CategoryWorksheetRow[] };
  dailySummaries: { [day: number]: DailySummary };
  monthTotals: {
    totalExpenses: number;
    totalBudget: number;
    totalCashSpent: number;
    totalCardSpent: number;
    totalWithdrawals: number;
    startingCash: number;
    endingCash: number;
  };
}

export interface ConsolidatedMasterBookData {
  masterCurrency: Currency;
  year: number;
  month: number;
  monthName: string;
  books: {
    book: AccountBook;
    totalLocalExpenses: number;
    totalMasterExpenses: number;
    transactionCount: number;
  }[];
  categoryTotals: {
    category: Category;
    totalMasterAmount: number;
    percentOfTotal: number;
  }[];
  grandTotalMasterExpenses: number;
  monthlyTrend: {
    monthStr: string; // e.g. "Jan", "Feb"
    totalMasterAmount: number;
  }[];
}

// =========================================================
// EXPENSES DASHBOARD TYPES
// =========================================================

export interface DashboardSummary {
  totalExpenses: number;
  prevPeriodExpenses: number;
  momChangePercent: number | null;
  transactionCount: number;
  avgTransaction: number;
  avgDailyExpense: number;
  totalBudget: number;
  budgetVariance: number;
  budgetUtilizationPercent: number;
  cashSpent: number;
  cardSpent: number;
  cashRatio: number;
  cardRatio: number;
  highestExpenseDay: { date: string; amount: number } | null;
  currency: {
    code: CurrencyCode;
    symbol: string;
    name: string;
  };
}

export interface CategoryExpenseBreakdown {
  categoryId: number;
  categoryName: string;
  groupName: string;
  headId?: number | null;
  headName?: string | null;
  headIcon?: string | null;
  headColor?: string | null;
  color: string;
  icon?: string;
  totalAmount: number;
  percentOfTotal: number;
  count: number;
  avgAmount: number;
  budget: number;
  variance: number;
}

export interface HeadExpenseBreakdown {
  headId: number;
  headName: string;
  headIcon: string;
  headColor: string;
  totalAmount: number;
  percentOfTotal: number;
  count: number;
}

export interface GroupExpenseBreakdown {
  groupName: string;
  totalAmount: number;
  percentOfTotal: number;
  count: number;
}

export interface MonthlyTrendItem {
  month: number;
  monthStr: string;
  yearMonth: string;
  totalExpenses: number;
  cashSpent: number;
  cardSpent: number;
  transactionCount: number;
}

export interface DailyExpenseItem {
  day: number;
  date: string;
  dayOfWeek: string;
  totalExpenses: number;
  cashSpent: number;
  cardSpent: number;
  transactionCount: number;
}

export interface WeekdayExpenseItem {
  dayIndex: number;
  dayName: string;
  totalExpenses: number;
  percentOfTotal: number;
  count: number;
  avgExpense: number;
}

export interface PaymentMethodBreakdown {
  method: 'cash' | 'debit_card' | 'credit_card';
  label: string;
  amount: number;
  percent: number;
  count: number;
}

export interface AccountExpenseBreakdown {
  accountId: number;
  accountName: string;
  accountType: string;
  institutionName?: string;
  amount: number;
  percent: number;
  count: number;
}

export interface ExpenseDashboardData {
  bookId: number | 'all';
  bookName: string;
  isConsolidated: boolean;
  period: 'month' | 'year' | 'all';
  year: number;
  month: number;
  monthName: string;
  summary: DashboardSummary;
  categoryBreakdown: CategoryExpenseBreakdown[];
  headBreakdown: HeadExpenseBreakdown[];
  groupBreakdown: GroupExpenseBreakdown[];
  monthlyTrend: MonthlyTrendItem[];
  dailyTrend: DailyExpenseItem[];
  weekdayBreakdown: WeekdayExpenseItem[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  accountBreakdown: AccountExpenseBreakdown[];
  topTransactions: Transaction[];
  availableYears: number[];
}

