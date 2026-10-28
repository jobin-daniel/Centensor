export type CurrencyCode = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP' | string;

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchange_rate_to_master: number; // e.g. 1 AED = 22.7 INR, or 1 USD = 83 INR
  decimal_digits: number;
  is_master_base: number; // 1 if this is the primary consolidated reporting currency
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  tier?: string;
}

export interface AccountBook {
  id: number;
  user_id?: number;
  name: string; // e.g. "Home Land (India)", "UAE Expenses", "US Travel"
  currency_code: CurrencyCode;
  currency_symbol?: string;
  description?: string;
  is_default: number;
  sort_order: number;
  created_at: string;
  accounts_count?: number;
  transactions_count?: number;
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
  user_id?: number;
  name: string; // e.g. "🍔 Food / Eating out", "🚗 Car / Transport", "🏠 House"
  icon?: string; // Emoji e.g. "🍔" or Lucide icon name
  color?: string; // Hex color code
  sort_order: number;
  sub_categories_count?: number;
  sub_heads?: Category[];
}

export interface Category {
  id: number;
  user_id?: number;
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

export type IncomeType = 
  | 'salary'
  | 'farm'
  | 'petty_hand_loan'
  | 'interest'
  | 'investment'
  | 'stock_capital'
  | 'freelance'
  | 'rental'
  | 'business'
  | 'gift'
  | 'refund'
  | 'other';

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
  income_type?: IncomeType | string;
  income_category?: string;
  repayment_due_date?: string;
  repayment_status?: 'pending' | 'repaid' | string;
  created_at: string;
}

export interface Budget {
  id: number;
  book_id: number;
  month: string; // YYYY-MM
  category_id: number;
  amount: number;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: number;
  user_id?: number;
  book_id: number;
  book_name?: string;
  account_id: number;
  account_name?: string;
  category_id?: number | null;
  category_name?: string;
  type: TransactionType;
  to_account_id?: number | null;
  to_account_name?: string;
  name: string;
  amount: number;
  currency_code: CurrencyCode;
  currency_symbol?: string;
  frequency: RecurringFrequency;
  day_of_month?: number;
  day_of_week?: number;
  start_date: string;
  end_date?: string | null;
  last_processed_date?: string | null;
  next_due_date?: string;
  payer_merchant?: string | null;
  description?: string | null;
  auto_post?: number;
  is_active: number;
  created_at?: string;
}

export interface CategoryBudgetDetail {
  categoryId: number;
  categoryName: string;
  groupName: string;
  headId?: number | null;
  headName?: string | null;
  headIcon?: string | null;
  headColor?: string | null;
  icon?: string;
  color?: string;
  budget: number;
  spent: number;
  variance: number; // budget - spent (positive = surplus/under budget, negative = over budget)
  utilizationPercent: number; // (spent / budget) * 100
  status: 'safe' | 'warning' | 'danger' | 'zero_spend' | 'unbudgeted';
  prevMonthBudget: number;
  prevMonthSpent: number;
  avg3MonthSpent: number;
  transactionCount: number;
}

export interface HeadBudgetSummary {
  headId: number;
  headName: string;
  headIcon: string;
  headColor: string;
  totalBudget: number;
  totalSpent: number;
  variance: number;
  utilizationPercent: number;
  isOverBudget: boolean;
  categories: CategoryBudgetDetail[];
}

export interface BudgetHistoricalMonth {
  month: number;
  monthStr: string;
  yearMonth: string;
  budget: number;
  spent: number;
  variance: number;
  utilizationPercent: number;
}

export interface MonthlyBudgetSummary {
  totalBudget: number;
  totalSpent: number;
  variance: number; // totalBudget - totalSpent
  utilizationPercent: number;
  isOverBudget: boolean;
  totalCategoriesCount: number;
  budgetedCategoriesCount: number;
  overBudgetCategoriesCount: number;
  underBudgetCategoriesCount: number;
  unbudgetedCategoriesCount: number;
  projectedEOMSpend: number;
  dailyBudget: number;
  dailyAvgSpent: number;
  previousMonthTotalBudget: number;
  previousMonthTotalSpent: number;
}

export interface MonthlyBudgetData {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  book: AccountBook;
  masterCurrency: Currency;
  summary: MonthlyBudgetSummary;
  heads: HeadBudgetSummary[];
  allCategories: CategoryBudgetDetail[];
  historicalMonthlyComparison: BudgetHistoricalMonth[];
  previousMonthStr: string;
}

export type SmartBudgetRule =
  | 'prev_month_budget'
  | 'prev_month_actual'
  | '3month_avg'
  | 'prev_budget_plus_5'
  | 'prev_budget_plus_10'
  | 'prev_budget_minus_5';

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

export interface MonthlyGlPreferences {
  bookId: number;
  month: string; // 'YYYY-MM'
  hasSavedPreferences: boolean;
  selectedHeadIds: number[];
  selectedCategoryIds: number[];
  headsWithTransactions: number[];
  categoriesWithTransactions: number[];
  transactionCountsByHead: Record<number, number>;
  transactionCountsByCategory: Record<number, number>;
  availableHeads: CategoryHead[];
  previousMonth: { month: string; headIds: number[]; count: number } | null;
}

export interface WorksheetGroupSection {
  headId?: number;
  name: string;
  icon?: string;
  color?: string;
  rows: CategoryWorksheetRow[];
}

export interface MonthlyWorksheetData {
  year: number;
  month: number; // 1 to 12
  monthName: string;
  daysInMonth: number;
  book: AccountBook;
  masterCurrency: Currency;
  categoriesByGroup: { [group: string]: CategoryWorksheetRow[] };
  groups?: WorksheetGroupSection[];
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
  hasSavedGlPreferences?: boolean;
  activeHeadCount?: number;
  totalAvailableHeads?: number;
  activeHeadIds?: number[];
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

// =========================================================
// INCOME & INFLOW TYPES
// =========================================================

export interface IncomeStreamDefinition {
  id?: number;
  user_id?: number;
  type: IncomeType | string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
  defaultCategories: string[];
  payerLabel: string;
  payerPlaceholder: string;
  descriptionPlaceholder: string;
  sort_order?: number;
  is_active?: number;
}

export interface IncomeTypeBreakdown {
  type: IncomeType;
  label: string;
  icon: string;
  color: string;
  totalAmount: number;
  totalMasterAmount: number;
  percentOfTotal: number;
  count: number;
}

export interface PettyHandLoanItem {
  id: number;
  bookId: number;
  bookName?: string;
  friendName: string;
  amount: number;
  currencyCode: CurrencyCode;
  currencySymbol?: string;
  dateBorrowed: string;
  repaymentDueDate?: string;
  repaymentStatus: 'pending' | 'repaid' | string;
  description?: string;
  notes?: string;
  accountName?: string;
  accountId: number;
}

export interface IncomeSummary {
  totalIncome: number;
  totalIncomeMaster: number;
  transactionCount: number;
  avgIncomeTransaction: number;
  totalHandLoans: number;
  pendingHandLoansTotal: number;
  pendingHandLoansCount: number;
  repaidHandLoansTotal: number;
  totalFarmIncome: number;
  totalStockCapital: number;
  totalInterest: number;
  totalInvestment: number;
  totalSalary: number;
  totalOther: number;
  currency: {
    code: CurrencyCode;
    symbol: string;
    name: string;
  };
}

export interface IncomeMonthlyTrendItem {
  month: number;
  monthStr: string;
  yearMonth: string;
  totalIncome: number;
  handLoanIncome: number;
  farmIncome: number;
  stockCapitalIncome: number;
  interestIncome: number;
  investmentIncome: number;
  salaryIncome: number;
  otherIncome: number;
  count: number;
}

export interface IncomeDashboardData {
  bookId: number | 'all';
  bookName: string;
  isConsolidated: boolean;
  year: number;
  month: number | null; // null if full year
  monthName: string;
  summary: IncomeSummary;
  typeBreakdown: IncomeTypeBreakdown[];
  monthlyTrend: IncomeMonthlyTrendItem[];
  handLoans: PettyHandLoanItem[];
  recentIncomes: Transaction[];
  accountBreakdown: {
    accountId: number;
    accountName: string;
    accountType: string;
    amount: number;
    percent: number;
    count: number;
  }[];
  availableYears: number[];
}

