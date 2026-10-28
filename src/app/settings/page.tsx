'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Building2,
  CreditCard,
  BookOpen,
  DollarSign,
  Layers,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  X,
  AlertTriangle,
  ArrowRightLeft,
  Repeat,
  Play,
  Pause,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Calendar,
  Sparkles,
  TrendingUp,
  Star,
} from 'lucide-react';
import {
  AccountBook,
  Institution,
  Account,
  Currency,
  Category,
  CategoryHead,
  RecurringTransaction,
  RecurringFrequency,
  IncomeStreamDefinition,
} from '@/lib/types';
import { formatCurrency, formatDateISO } from '@/lib/formatters';

type SettingsTab = 'institutions' | 'accounts' | 'income_types' | 'recurring' | 'books' | 'currencies' | 'categories';

interface SettingsPageProps {
  initialTab?: SettingsTab;
}

export default function SettingsPage({ initialTab = 'accounts' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SettingsTab;
      if (tabParam && ['institutions', 'accounts', 'income_types', 'recurring', 'books', 'currencies', 'categories'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryHeads, setCategoryHeads] = useState<CategoryHead[]>([]);
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);

  // Master Currency
  const [masterCurrency, setMasterCurrencyState] = useState<Currency | null>(null);

  // --- Account Edit & Transfer States ---
  const [isEditAccModalOpen, setIsEditAccModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccType, setEditAccType] = useState('bank');
  const [editAccBookId, setEditAccBookId] = useState<number>(1);
  const [editAccInstId, setEditAccInstId] = useState<string>('');
  const [editAccCurr, setEditAccCurr] = useState('INR');
  const [editAccOpeningBalance, setEditAccOpeningBalance] = useState('0');
  const [editAccLimit, setEditAccLimit] = useState('0');
  const [editAccLast4, setEditAccLast4] = useState('');
  const [editAccBillingDay, setEditAccBillingDay] = useState('');
  const [editAccIsActive, setEditAccIsActive] = useState(1);
  const [accConsequencesAcknowledged, setAccConsequencesAcknowledged] = useState(false);

  // Quick Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<number>(0);
  const [transferToId, setTransferToId] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(() => {
    const now = new Date();
    return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [transferDesc, setTransferDesc] = useState('');
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);

  // --- Recurring Income State ---
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<RecurringTransaction | null>(null);
  const [recName, setRecName] = useState('');
  const [recBookId, setRecBookId] = useState<number>(1);
  const [recAccountId, setRecAccountId] = useState<number>(0);
  const [recCategoryId, setRecCategoryId] = useState<string>('');
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recDayOfMonth, setRecDayOfMonth] = useState<number>(1);
  const [recDayOfWeek, setRecDayOfWeek] = useState<number>(1);
  const [recStartDate, setRecStartDate] = useState(() => {
    const now = new Date();
    return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [recEndDate, setRecEndDate] = useState('');
  const [recPayer, setRecPayer] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recAutoPost, setRecAutoPost] = useState(1);
  const [recIsActive, setRecIsActive] = useState(1);
  const [recFilterBook, setRecFilterBook] = useState<string>('');

  // Main Head and Sub Head states
  const [catSearch, setCatSearch] = useState('');
  const [collapsedHeads, setCollapsedHeads] = useState<Record<number, boolean>>({});

  // Head Modal State
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<CategoryHead | null>(null);
  const [headName, setHeadName] = useState('');
  const [headIcon, setHeadIcon] = useState('📁');
  const [headColor, setHeadColor] = useState('#6366F1');

  // Sub Head Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Category | null>(null);
  const [subHeadId, setSubHeadId] = useState<number | ''>('');
  const [subName, setSubName] = useState('');
  const [subIcon, setSubIcon] = useState('🏷️');
  const [subColor, setSubColor] = useState('#10B981');
  const [subBudget, setSubBudget] = useState('0');

  // --- Income Stream Types State ---
  const [incomeTypes, setIncomeTypes] = useState<IncomeStreamDefinition[]>([]);
  const [isIncTypeModalOpen, setIsIncTypeModalOpen] = useState(false);
  const [editingIncType, setEditingIncType] = useState<IncomeStreamDefinition | null>(null);
  const [incTypeKey, setIncTypeKey] = useState('');
  const [incLabel, setIncLabel] = useState('');
  const [incShortLabel, setIncShortLabel] = useState('');
  const [incIcon, setIncIcon] = useState('💰');
  const [incColor, setIncColor] = useState('#10B981');
  const [incDesc, setIncDesc] = useState('');
  const [incPayerLabel, setIncPayerLabel] = useState('Payer / Source');
  const [incPayerPlaceholder, setIncPayerPlaceholder] = useState('e.g. Source name');
  const [incDescriptionPlaceholder, setIncDescriptionPlaceholder] = useState('e.g. Income details');
  const [incSubcategoriesText, setIncSubcategoriesText] = useState('');
  const [incIsActive, setIncIsActive] = useState(1);
  const [incFilterSearch, setIncFilterSearch] = useState('');
  const [inlineNewSub, setInlineNewSub] = useState<Record<number, string>>({});

  // New Account & Institution Form states
  const [newInstName, setNewInstName] = useState('');
  const [newInstCountry, setNewInstCountry] = useState('IN');

  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('bank');
  const [newAccBookId, setNewAccBookId] = useState<number>(1);
  const [newAccInstId, setNewAccInstId] = useState<string>('');
  const [newAccCurr, setNewAccCurr] = useState('INR');
  const [newAccBalance, setNewAccBalance] = useState('0');
  const [newAccLimit, setNewAccLimit] = useState('0');

  const [newBookName, setNewBookName] = useState('');
  const [newBookCurr, setNewBookCurr] = useState('INR');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookIsDefault, setNewBookIsDefault] = useState(false);

  // Edit Account Book Modal States
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<AccountBook | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [editBookCurr, setEditBookCurr] = useState('INR');
  const [editBookDesc, setEditBookDesc] = useState('');
  const [editBookIsDefault, setEditBookIsDefault] = useState(false);
  const [editBookSortOrder, setEditBookSortOrder] = useState('1');
  const [isSavingBook, setIsSavingBook] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mdRes, booksRes, catRes, recRes, incRes] = await Promise.all([
        fetch('/api/master-data'),
        fetch('/api/books'),
        fetch('/api/categories'),
        fetch('/api/recurring'),
        fetch('/api/income-types'),
      ]);
      const [mdJson, booksJson, catJson, recJson, incJson] = await Promise.all([
        mdRes.json(),
        booksRes.json(),
        catRes.json(),
        recRes.json(),
        incRes.json(),
      ]);

      if (mdJson.success) {
        setInstitutions(mdJson.data.institutions || []);
        setAccounts(mdJson.data.accounts || []);
        setCurrencies(mdJson.data.currencies || []);
        setMasterCurrencyState(mdJson.data.masterCurrency || null);
      }
      if (booksJson.success) {
        setBooks(booksJson.books || []);
        if (booksJson.books?.length > 0 && !newAccBookId) {
          setNewAccBookId(booksJson.books[0].id);
        }
      }
      if (catJson.success) {
        setCategories(catJson.categories || []);
        setCategoryHeads(catJson.heads || []);
      }
      if (recJson.success) {
        setRecurringList(recJson.recurring || []);
      }
      if (incJson.success) {
        setIncomeTypes(incJson.incomeTypes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Account Edit Handlers with Consequences Alert ---
  const openEditAccountModal = (acc: Account) => {
    setEditingAccount(acc);
    setEditAccName(acc.name);
    setEditAccType(acc.type);
    setEditAccBookId(acc.book_id);
    setEditAccInstId(acc.institution_id ? String(acc.institution_id) : '');
    setEditAccCurr(acc.currency_code);
    setEditAccOpeningBalance(String(acc.opening_balance));
    setEditAccLimit(String(acc.credit_limit || 0));
    setEditAccLast4(acc.account_number_last4 || '');
    setEditAccBillingDay(acc.billing_cycle_day ? String(acc.billing_cycle_day) : '');
    setEditAccIsActive(acc.is_active !== undefined ? acc.is_active : 1);
    setAccConsequencesAcknowledged(false);
    setIsEditAccModalOpen(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccName.trim()) return;

    const openingBalNum = parseFloat(editAccOpeningBalance) || 0;
    const isOpeningChanged = openingBalNum !== editingAccount.opening_balance;
    const isCurrChanged = editAccCurr !== editingAccount.currency_code;
    const isBookChanged = editAccBookId !== editingAccount.book_id;
    const isTypeChanged = editAccType !== editingAccount.type;

    if (isOpeningChanged || isCurrChanged || isBookChanged || isTypeChanged) {
      if (!accConsequencesAcknowledged) {
        const confirmMsg = `⚠️ Critical Master Account Change Warning:\n\n` +
          (isOpeningChanged ? `• Opening Balance changed from ${editingAccount.opening_balance} to ${openingBalNum}. Current balance will shift by ${openingBalNum - editingAccount.opening_balance} and adjust historical cash reconciliations.\n` : '') +
          (isCurrChanged ? `• Currency changed from ${editingAccount.currency_code} to ${editAccCurr}.\n` : '') +
          (isBookChanged ? `• Account book changed from ID #${editingAccount.book_id} to #${editAccBookId}.\n` : '') +
          (isTypeChanged ? `• Account type changed from ${editingAccount.type} to ${editAccType}.\n` : '') +
          `\nAre you sure you want to commit these changes?`;

        if (!confirm(confirmMsg)) return;
      }
    }

    try {
      const res = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_account',
          payload: {
            id: editingAccount.id,
            book_id: editAccBookId,
            institution_id: editAccInstId ? parseInt(editAccInstId, 10) : null,
            name: editAccName.trim(),
            type: editAccType,
            currency_code: editAccCurr,
            account_number_last4: editAccLast4.trim() || null,
            opening_balance: openingBalNum,
            credit_limit: parseFloat(editAccLimit) || 0,
            billing_cycle_day: editAccBillingDay ? parseInt(editAccBillingDay, 10) : null,
            is_active: editAccIsActive,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsEditAccModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to update account');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating master account');
    }
  };

  const handleDeleteAccount = async (acc: Account) => {
    const confirmMsg = `Are you sure you want to remove account "${acc.name}"?\n\nIf transactions exist under this account, it will be safely deactivated so your historical balance history is preserved.`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/master-data?id=${acc.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to remove account');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting account');
    }
  };

  // --- Quick Transfer Handlers ---
  const openTransferModal = (fromAccId?: number) => {
    const sourceId = fromAccId || accounts[0]?.id || 0;
    setTransferFromId(sourceId);
    const dest = accounts.find((a) => a.id !== sourceId);
    setTransferToId(dest?.id || 0);
    setTransferAmount('');
    setTransferDesc('');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0 || !transferFromId || !transferToId || transferFromId === transferToId) {
      alert('Please enter a valid amount and select two different accounts.');
      return;
    }

    const srcAccount = accounts.find((a) => a.id === transferFromId);
    const toAccount = accounts.find((a) => a.id === transferToId);
    if (!srcAccount || !toAccount) return;

    setIsTransferSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: srcAccount.book_id,
          date: transferDate,
          amount: amt,
          account_id: srcAccount.id,
          payment_method: srcAccount.type === 'cash' ? 'cash' : 'debit_card',
          type: 'transfer',
          to_account_id: toAccount.id,
          description: transferDesc || `Transfer from ${srcAccount.name} to ${toAccount.name}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsTransferModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Transfer failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error executing transfer');
    } finally {
      setIsTransferSubmitting(false);
    }
  };

  // --- Recurring Income Handlers ---
  const openCreateRecurringModal = () => {
    setEditingRec(null);
    setRecName('');
    const firstBook = books[0]?.id || 1;
    setRecBookId(firstBook);
    const firstAcc = accounts.find((a) => a.book_id === firstBook) || accounts[0];
    setRecAccountId(firstAcc?.id || 0);
    setRecCategoryId('');
    setRecAmount('');
    setRecFrequency('monthly');
    setRecDayOfMonth(1);
    setRecDayOfWeek(1);
    const now = new Date();
    setRecStartDate(formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate()));
    setRecEndDate('');
    setRecPayer('');
    setRecDesc('');
    setRecAutoPost(1);
    setRecIsActive(1);
    setIsRecModalOpen(true);
  };

  const openEditRecurringModal = (rec: RecurringTransaction) => {
    setEditingRec(rec);
    setRecName(rec.name);
    setRecBookId(rec.book_id);
    setRecAccountId(rec.account_id);
    setRecCategoryId(rec.category_id ? String(rec.category_id) : '');
    setRecAmount(String(rec.amount));
    setRecFrequency(rec.frequency);
    setRecDayOfMonth(rec.day_of_month || 1);
    setRecDayOfWeek(rec.day_of_week || 1);
    setRecStartDate(rec.start_date);
    setRecEndDate(rec.end_date || '');
    setRecPayer(rec.payer_merchant || '');
    setRecDesc(rec.description || '');
    setRecAutoPost(rec.auto_post !== undefined ? rec.auto_post : 1);
    setRecIsActive(rec.is_active !== undefined ? rec.is_active : 1);
    setIsRecModalOpen(true);
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !parseFloat(recAmount) || !recAccountId) {
      alert('Please fill out income name, amount, and credit account.');
      return;
    }

    try {
      const selectedAcc = accounts.find((a) => a.id === recAccountId);
      const payload = {
        id: editingRec?.id,
        book_id: recBookId,
        account_id: recAccountId,
        category_id: recCategoryId ? parseInt(recCategoryId, 10) : null,
        type: 'income',
        name: recName.trim(),
        amount: parseFloat(recAmount),
        currency_code: selectedAcc?.currency_code || 'INR',
        frequency: recFrequency,
        day_of_month: recDayOfMonth,
        day_of_week: recDayOfWeek,
        start_date: recStartDate,
        end_date: recEndDate || null,
        payer_merchant: recPayer.trim() || null,
        description: recDesc.trim() || null,
        auto_post: recAutoPost,
        is_active: recIsActive,
      };

      const res = await fetch('/api/recurring', {
        method: editingRec ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setIsRecModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to save recurring income');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving recurring income stream');
    }
  };

  const handleProcessRecurringNow = async (rec: RecurringTransaction) => {
    if (!confirm(`Post income "${rec.name}" (${formatCurrency(rec.amount, rec.currency_code, rec.currency_symbol)}) into ledger now?`)) {
      return;
    }

    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          id: rec.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Successfully posted income! Next due date: ${json.nextDueDate}`);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to process recurring income');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing recurring income');
    }
  };

  const handleToggleActiveRecurring = async (rec: RecurringTransaction) => {
    try {
      const nextActive = rec.is_active ? 0 : 1;
      await fetch('/api/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rec.id,
          is_active: nextActive,
        }),
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecurring = async (rec: RecurringTransaction) => {
    if (!confirm(`Are you sure you want to delete recurring schedule "${rec.name}"?`)) return;

    try {
      const res = await fetch(`/api/recurring?id=${rec.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting recurring schedule');
    }
  };

  // --- Income Stream Types Handlers ---
  const fetchIncomeTypes = async () => {
    try {
      const res = await fetch('/api/income-types');
      const json = await res.json();
      if (json.success) {
        setIncomeTypes(json.incomeTypes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openAddIncomeTypeModal = () => {
    setEditingIncType(null);
    setIncTypeKey('');
    setIncLabel('');
    setIncShortLabel('');
    setIncIcon('💰');
    setIncColor('#10B981');
    setIncDesc('');
    setIncPayerLabel('Payer / Source');
    setIncPayerPlaceholder('e.g. Source name');
    setIncDescriptionPlaceholder('e.g. Income details');
    setIncSubcategoriesText('');
    setIncIsActive(1);
    setIsIncTypeModalOpen(true);
  };

  const openEditIncomeTypeModal = (typeDef: IncomeStreamDefinition) => {
    setEditingIncType(typeDef);
    setIncTypeKey(String(typeDef.type));
    setIncLabel(typeDef.label);
    setIncShortLabel(typeDef.shortLabel);
    setIncIcon(typeDef.icon || '💰');
    setIncColor(typeDef.color || '#10B981');
    setIncDesc(typeDef.description || '');
    setIncPayerLabel(typeDef.payerLabel || 'Payer / Source');
    setIncPayerPlaceholder(typeDef.payerPlaceholder || 'e.g. Source name');
    setIncDescriptionPlaceholder(typeDef.descriptionPlaceholder || 'e.g. Income details');
    setIncSubcategoriesText((typeDef.defaultCategories || []).join(', '));
    setIncIsActive(typeDef.is_active !== undefined ? typeDef.is_active : 1);
    setIsIncTypeModalOpen(true);
  };

  const handleSaveIncomeType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incLabel.trim()) return;

    const subcats = incSubcategoriesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingIncType && editingIncType.id) {
        const res = await fetch('/api/income-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingIncType.id,
            label: incLabel.trim(),
            shortLabel: incShortLabel.trim() || incLabel.trim(),
            icon: incIcon,
            color: incColor,
            description: incDesc.trim(),
            payerLabel: incPayerLabel.trim(),
            payerPlaceholder: incPayerPlaceholder.trim(),
            descriptionPlaceholder: incDescriptionPlaceholder.trim(),
            defaultCategories: subcats,
            is_active: incIsActive,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setIsIncTypeModalOpen(false);
          await fetchIncomeTypes();
        } else {
          alert(json.error || 'Failed to update income stream');
        }
      } else {
        const key = (incTypeKey.trim() || incLabel.trim()).toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const res = await fetch('/api/income-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: key,
            label: incLabel.trim(),
            shortLabel: incShortLabel.trim() || incLabel.trim(),
            icon: incIcon,
            color: incColor,
            description: incDesc.trim(),
            payerLabel: incPayerLabel.trim(),
            payerPlaceholder: incPayerPlaceholder.trim(),
            descriptionPlaceholder: incDescriptionPlaceholder.trim(),
            defaultCategories: subcats,
            is_active: incIsActive,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setIsIncTypeModalOpen(false);
          await fetchIncomeTypes();
        } else {
          alert(json.error || 'Failed to create income stream');
        }
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the income stream.');
    }
  };

  const handleDeleteIncomeType = async (typeDef: IncomeStreamDefinition) => {
    if (!typeDef.id) return;
    if (!confirm(`Are you sure you want to delete income stream "${typeDef.label}"? Existing logged transactions will retain their historical record.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/income-types?id=${typeDef.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchIncomeTypes();
      } else {
        alert(json.error || 'Failed to delete income type');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetIncomeTypes = async () => {
    if (!confirm('Reset all income stream types to standard factory defaults (Petty Hand Loans, Farm, Stock Capital, Interest, Investments, Salary, etc.)? Any custom stream settings will be reset.')) {
      return;
    }
    try {
      const res = await fetch('/api/income-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const json = await res.json();
      if (json.success) {
        setIncomeTypes(json.incomeTypes || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInlineSubcategory = async (id: number) => {
    const sub = (inlineNewSub[id] || '').trim();
    if (!sub) return;
    try {
      const res = await fetch('/api/income-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_subcategory', id, subcategory: sub }),
      });
      const json = await res.json();
      if (json.success) {
        setInlineNewSub(prev => ({ ...prev, [id]: '' }));
        await fetchIncomeTypes();
      } else {
        alert(json.error || 'Failed to add subcategory');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveSubcategory = async (id: number, subcategory: string) => {
    try {
      const res = await fetch('/api/income-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_subcategory', id, subcategory }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchIncomeTypes();
      } else {
        alert(json.error || 'Failed to remove subcategory');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleIncomeTypeActive = async (typeDef: IncomeStreamDefinition) => {
    if (!typeDef.id) return;
    const newStatus = typeDef.is_active === 0 ? 1 : 0;
    try {
      const res = await fetch('/api/income-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: typeDef.id,
          is_active: newStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchIncomeTypes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Category Head & Sub Head Handlers ---
  const toggleCollapseHead = (headId: number) => {
    setCollapsedHeads((prev) => ({ ...prev, [headId]: !prev[headId] }));
  };

  const openCreateHeadModal = () => {
    setEditingHead(null);
    setHeadName('');
    setHeadIcon('📁');
    setHeadColor('#6366F1');
    setIsHeadModalOpen(true);
  };

  const openEditHeadModal = (h: CategoryHead) => {
    setEditingHead(h);
    setHeadName(h.name);
    setHeadIcon(h.icon || '📁');
    setHeadColor(h.color || '#6366F1');
    setIsHeadModalOpen(true);
  };

  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) return;

    try {
      const url = '/api/categories';
      const method = editingHead ? 'PUT' : 'POST';
      const body = editingHead
        ? { action: 'update_head', id: editingHead.id, name: headName.trim(), icon: headIcon, color: headColor }
        : { action: 'create_head', name: headName.trim(), icon: headIcon, color: headColor };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setIsHeadModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to save Main Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving Main Head');
    }
  };

  const handleDeleteHead = async (h: CategoryHead) => {
    const subCount = h.sub_heads?.length || 0;
    const msg = subCount > 0
      ? `Main Head "${h.name}" contains ${subCount} Sub Heads. Deleting it will also delete its Sub Heads and unlink any transactions. Are you sure?`
      : `Are you sure you want to delete Main Head "${h.name}"?`;

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/categories?id=${h.id}&type=head&cascade=true`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete Main Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting Main Head');
    }
  };

  const openCreateSubModal = (parentHeadId?: number) => {
    setEditingSub(null);
    setSubHeadId(parentHeadId || (categoryHeads[0]?.id ?? ''));
    setSubName('');
    setSubIcon('🏷️');
    const parentHead = categoryHeads.find((h) => h.id === parentHeadId);
    setSubColor(parentHead?.color || '#10B981');
    setSubBudget('0');
    setIsSubModalOpen(true);
  };

  const openEditSubModal = (sub: Category) => {
    setEditingSub(sub);
    setSubHeadId(sub.head_id || (categoryHeads.find((h) => h.name === sub.group_name)?.id ?? ''));
    setSubName(sub.name);
    setSubIcon(sub.icon || '🏷️');
    setSubColor(sub.color || '#10B981');
    setSubBudget(String(sub.monthly_budget || 0));
    setIsSubModalOpen(true);
  };

  const handleSaveSubHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    try {
      const url = '/api/categories';
      const method = editingSub ? 'PUT' : 'POST';
      const parentHead = categoryHeads.find((h) => h.id === Number(subHeadId));
      const body = editingSub
        ? {
            action: 'update_subhead',
            id: editingSub.id,
            head_id: subHeadId ? Number(subHeadId) : null,
            name: subName.trim(),
            group_name: parentHead?.name || editingSub.group_name,
            icon: subIcon,
            color: subColor,
          }
        : {
            action: 'create_subhead',
            head_id: subHeadId ? Number(subHeadId) : null,
            name: subName.trim(),
            group_name: parentHead?.name,
            icon: subIcon,
            color: subColor,
            monthly_budget: parseFloat(subBudget) || 0,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setIsSubModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to save Sub Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving Sub Head');
    }
  };

  const handleDeleteSub = async (sub: Category) => {
    if (!confirm(`Are you sure you want to delete Sub Head "${sub.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories?id=${sub.id}&type=subhead`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete Sub Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting Sub Head');
    }
  };

  const handleResetCategories = async () => {
    const confirmed = confirm(
      'Are you sure you want to load the recommended template of Main Heads and Sub Heads?\n\nThis will install the full suggested taxonomy.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_defaults' }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Successfully applied recommended Main Heads & Sub Heads template!');
        fetchAllData();
      } else {
        alert(json.error || 'Failed to reset categories');
      }
    } catch (err) {
      console.error(err);
      alert('Error resetting categories');
    }
  };

  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName) return;
    try {
      const res = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_institution',
          payload: { name: newInstName, country_code: newInstCountry },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewInstName('');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName) return;
    try {
      const res = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account',
          payload: {
            book_id: newAccBookId,
            institution_id: newAccInstId ? parseInt(newAccInstId, 10) : null,
            name: newAccName,
            type: newAccType,
            currency_code: newAccCurr,
            opening_balance: parseFloat(newAccBalance) || 0,
            credit_limit: parseFloat(newAccLimit) || 0,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewAccName('');
        setNewAccBalance('0');
        setNewAccLimit('0');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getBookBadge = (name: string) => {
    if (!name) return '💼';
    const lower = name.toLowerCase();
    if (lower.includes('india') || lower.includes('home')) return '🇮🇳';
    if (lower.includes('uae') || lower.includes('dubai') || lower.includes('emirates')) return '🇦🇪';
    if (lower.includes('us') || lower.includes('usa') || lower.includes('travel') || lower.includes('america')) return '🇺🇸';
    if (lower.includes('uk') || lower.includes('london') || lower.includes('britain')) return '🇬🇧';
    if (lower.includes('europe') || lower.includes('euro')) return '🇪🇺';
    if (lower.includes('singapore')) return '🇸🇬';
    if (lower.includes('canada')) return '🇨🇦';
    return '💼';
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBookName.trim(),
          currency_code: newBookCurr,
          description: newBookDesc.trim(),
          is_default: newBookIsDefault ? 1 : 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewBookName('');
        setNewBookDesc('');
        setNewBookIsDefault(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to create account book');
      }
    } catch (e) {
      console.error(e);
      alert('Error creating account book');
    }
  };

  const openEditBookModal = (book: AccountBook) => {
    setEditingBook(book);
    setEditBookName(book.name);
    setEditBookCurr(book.currency_code);
    setEditBookDesc(book.description || '');
    setEditBookIsDefault(book.is_default === 1);
    setEditBookSortOrder(String(book.sort_order ?? 1));
    setIsEditBookModalOpen(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editBookName.trim()) return;

    setIsSavingBook(true);
    try {
      const res = await fetch('/api/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBook.id,
          name: editBookName.trim(),
          currency_code: editBookCurr,
          description: editBookDesc.trim(),
          is_default: editBookIsDefault ? 1 : 0,
          sort_order: parseInt(editBookSortOrder, 10) || 1,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsEditBookModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to update account book');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating account book');
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleSetBookDefault = async (book: AccountBook) => {
    if (book.is_default) return;
    try {
      const res = await fetch('/api/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: book.id,
          is_default: 1,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to set default account book');
      }
    } catch (err) {
      console.error(err);
      alert('Error setting default account book');
    }
  };

  const handleDeleteBook = async (book: AccountBook) => {
    if (books.length <= 1) {
      alert('You cannot delete your only account book. A workspace must retain at least one active account book.');
      return;
    }

    const accCount = book.accounts_count ?? accounts.filter((a) => a.book_id === book.id).length;
    const txCount = book.transactions_count ?? 0;

    let confirmMsg = `Are you sure you want to delete the account book "${book.name}"?\n\n`;
    if (accCount > 0 || txCount > 0) {
      confirmMsg += `⚠️ WARNING: This account book contains ${accCount} account(s) and ${txCount} transaction(s).\nDeleting this book will permanently remove all associated accounts, transactions, budgets, and historical records.\n\n`;
    }
    confirmMsg += `This action cannot be undone. Do you wish to proceed?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/books?id=${book.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        if (isEditBookModalOpen && editingBook?.id === book.id) {
          setIsEditBookModalOpen(false);
        }
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete account book');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting account book');
    }
  };

  const handleUpdateRate = async (code: string, newRate: number) => {
    try {
      await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_currency_rate',
          payload: { code, rate: newRate },
        }),
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetMasterCurrency = async (code: string) => {
    try {
      await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_master_currency',
          payload: { code },
        }),
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations for Recurring Income KPI
  const activeRecurringCount = recurringList.filter((r) => r.is_active).length;
  const totalMonthlyProjectedIncome = recurringList
    .filter((r) => r.is_active)
    .reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === 'weekly') multiplier = 4.33;
      else if (r.frequency === 'biweekly') multiplier = 2.16;
      else if (r.frequency === 'quarterly') multiplier = 1 / 3;
      else if (r.frequency === 'yearly') multiplier = 1 / 12;
      return sum + r.amount * multiplier;
    }, 0);

  // Live Opening Balance Diff for consequences preview
  const openingDiff = editingAccount
    ? (parseFloat(editAccOpeningBalance) || 0) - editingAccount.opening_balance
    : 0;
  const previewedCurrentBalance = editingAccount
    ? editingAccount.current_balance + openingDiff
    : 0;

  const srcTransferAcc = accounts.find((a) => a.id === transferFromId);
  const destTransferAcc = accounts.find((a) => a.id === transferToId);

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Back to Home Navigation */}
      <div style={{ paddingTop: '20px', marginBottom: '8px' }}>
        <Link
          href="/"
          className="btn btn-secondary"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            padding: '7px 16px',
            width: 'fit-content',
          }}
          title="Return to home page"
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0 20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
              <Sliders size={20} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Master Data & System Settings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Configure Master Accounts, Account Transfers, Recurring Income Streams, Banks, Multi-Currency Books, and General Ledger Heads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => openTransferModal()} title="Transfer funds between master accounts">
            <ArrowRightLeft size={14} color="#a78bfa" />
            <span>Account Transfer</span>
          </button>
          <button className="btn btn-secondary" onClick={fetchAllData} title="Refresh data">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', overflowX: 'auto', marginBottom: '24px' }}>
        <button
          className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('accounts')}
        >
          <CreditCard size={16} />
          <span>Payment Accounts ({accounts.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'income_types' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('income_types')}
        >
          <TrendingUp size={16} color={activeTab === 'income_types' ? 'currentColor' : '#10b981'} />
          <span>Income Streams ({incomeTypes.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'recurring' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recurring')}
        >
          <Repeat size={16} color={activeTab === 'recurring' ? 'currentColor' : '#34d399'} />
          <span>Recurring Income ({recurringList.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'institutions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('institutions')}
        >
          <Building2 size={16} />
          <span>Banks & Institutions ({institutions.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'books' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('books')}
        >
          <BookOpen size={16} />
          <span>Account Books ({books.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'currencies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('currencies')}
        >
          <DollarSign size={16} />
          <span>Currencies & Rates ({currencies.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={16} />
          <span>GL Categories ({categories.length})</span>
        </button>
      </div>

      {/* Tab 1: Master Payment Accounts */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* Accounts List */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Configured Master Accounts</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Click Edit on any account to update balances, currency, or institution settings.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => openTransferModal()}>
                <ArrowRightLeft size={13} color="#a78bfa" />
                <span>Quick Transfer</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{acc.name}</span>
                      <span className="badge badge-debit" style={{ fontSize: '10px' }}>
                        {acc.book_name}
                      </span>
                      {!acc.is_active && (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '10px' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span>Type: <strong style={{ color: 'var(--text-secondary)' }}>{acc.type}</strong></span>
                      <span>Opening: <strong style={{ color: 'var(--text-secondary)' }}>{formatCurrency(acc.opening_balance, acc.currency_code, acc.currency_symbol)}</strong></span>
                      {acc.credit_limit ? <span>Limit: <strong>{acc.credit_limit}</strong></span> : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Balance</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(acc.current_balance, acc.currency_code, acc.currency_symbol)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px' }}
                        onClick={() => openEditAccountModal(acc)}
                        title="Edit Master Account details & balances"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--danger-rose)' }}
                        onClick={() => handleDeleteAccount(acc)}
                        title="Delete / Deactivate account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Account Form */}
          <form
            onSubmit={handleAddAccount}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Add New Master Account</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Link to Account Book</label>
              <select className="form-select" value={newAccBookId} onChange={(e) => setNewAccBookId(parseInt(e.target.value, 10))}>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.currency_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Financial Institution (Optional)</label>
              <select className="form-select" value={newAccInstId} onChange={(e) => setNewAccInstId(e.target.value)}>
                <option value="">-- Direct / Unlinked --</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.country_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Account Name</label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Regalia Card, ENBD Savings"
                className="form-input"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-select" value={newAccType} onChange={(e) => setNewAccType(e.target.value)}>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank">Bank Account</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={newAccCurr} onChange={(e) => setNewAccCurr(e.target.value)}>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                />
              </div>
              {newAccType === 'credit_card' && (
                <div className="form-group">
                  <label className="form-label">Credit Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={newAccLimit}
                    onChange={(e) => setNewAccLimit(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Create Account</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: Configurable Income Types & Inflow Streams */}
      {activeTab === 'income_types' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={20} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Configurable Income Streams &amp; Types</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Configure presets for Petty Hand Loans from Friends, Farm Income, Stock Capital, Interests, Investments, and custom income streams.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter streams..."
                  className="form-input"
                  style={{ paddingLeft: '30px', width: '180px', fontSize: '12px' }}
                  value={incFilterSearch}
                  onChange={(e) => setIncFilterSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                onClick={handleResetIncomeTypes}
                title="Reset all streams back to factory defaults"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '8px 14px', background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                onClick={openAddIncomeTypeModal}
              >
                <Plus size={15} />
                <span>Add Income Stream</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {incomeTypes
              .filter((it) => {
                if (!incFilterSearch) return true;
                const q = incFilterSearch.toLowerCase();
                return (
                  it.label.toLowerCase().includes(q) ||
                  it.shortLabel.toLowerCase().includes(q) ||
                  String(it.type).toLowerCase().includes(q) ||
                  it.description.toLowerCase().includes(q) ||
                  (it.defaultCategories || []).some((c) => c.toLowerCase().includes(q))
                );
              })
              .map((it) => {
                const isActive = it.is_active !== 0;
                return (
                  <div
                    key={it.id || it.type}
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${isActive ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.2)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      opacity: isActive ? 1 : 0.65,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: `${it.color || '#10b981'}20`,
                            border: `1px solid ${it.color || '#10b981'}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                          }}
                        >
                          {it.icon || '💰'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>{it.label}</span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {it.shortLabel}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{it.type}</code>
                            {isActive ? (
                              <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                ● Active
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                ○ Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px', fontSize: '11px' }}
                          onClick={() => openEditIncomeTypeModal(it)}
                          title="Edit this stream definition"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px', fontSize: '11px', color: '#ef4444' }}
                          onClick={() => handleDeleteIncomeType(it)}
                          title="Delete this stream"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {it.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {it.description}
                      </p>
                    )}

                    {/* Payer Configuration Badge */}
                    <div
                      style={{
                        fontSize: '11px',
                        background: 'var(--bg-surface-elevated)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>
                        Counterparty Field: <strong style={{ color: 'var(--text-primary)' }}>{it.payerLabel}</strong>
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '10px' }}>
                        Placeholder: &quot;{it.payerPlaceholder}&quot;
                      </span>
                    </div>

                    {/* Subcategories / Crops / Instruments */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Subcategories &amp; Categories ({(it.defaultCategories || []).length})
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {(it.defaultCategories || []).map((subcat) => (
                          <span
                            key={subcat}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span>{subcat}</span>
                            {it.id && (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                onClick={() => handleRemoveSubcategory(it.id!, subcat)}
                                title={`Remove "${subcat}"`}
                              >
                                <X size={11} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Quick Add Subcategory Input */}
                      {it.id && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Add subcategory..."
                            className="form-input"
                            style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                            value={inlineNewSub[it.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInlineNewSub((prev) => ({ ...prev, [it.id!]: val }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInlineSubcategory(it.id!);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', height: '28px', fontSize: '11px' }}
                            onClick={() => handleAddInlineSubcategory(it.id!)}
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Toggle Active Switch */}
                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isActive ? 'Available in Income Presets' : 'Hidden from Presets'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          color: isActive ? 'var(--text-secondary)' : '#10b981',
                        }}
                        onClick={() => handleToggleIncomeTypeActive(it)}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 2: Recurring Income Streams */}
      {activeTab === 'recurring' && (
        <div>
          {/* Top KPI Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Recurring Incomes</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#34d399' }}>
                {activeRecurringCount} Streams
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Scheduled automatic / recurring inflows
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Est. Monthly Recurring Inflow</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>
                {formatCurrency(totalMonthlyProjectedIncome, masterCurrency?.code || 'INR', masterCurrency?.symbol || '₹')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Calculated monthly run-rate
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={openCreateRecurringModal} style={{ width: '100%', padding: '10px' }}>
                <Plus size={16} />
                <span>+ Add Recurring Income</span>
              </button>
            </div>
          </div>

          {/* List of Recurring Streams */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Repeat size={18} color="#34d399" />
                  <span>Configured Recurring Income Schedules</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Manage salaries, rental incomes, freelancer retainers, dividends, and automated credit entries.
                </p>
              </div>

              <select
                className="form-select"
                style={{ width: '200px' }}
                value={recFilterBook}
                onChange={(e) => setRecFilterBook(e.target.value)}
              >
                <option value="">All Account Books</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.currency_code})
                  </option>
                ))}
              </select>
            </div>

            {recurringList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                <Repeat size={32} color="#34d399" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>No Recurring Income Streams Configured</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '6px auto 16px' }}>
                  Add your regular salary, monthly dividends, or rental payments to easily track and post incoming cash flows.
                </p>
                <button className="btn btn-primary" onClick={openCreateRecurringModal}>
                  <Plus size={14} />
                  <span>Add First Recurring Income</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recurringList
                  .filter((r) => !recFilterBook || r.book_id === parseInt(recFilterBook, 10))
                  .map((rec) => (
                    <div
                      key={rec.id}
                      style={{
                        padding: '16px 18px',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                            {rec.name}
                          </span>
                          <span className="badge badge-cash" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                            {rec.frequency}
                          </span>
                          <span className="badge badge-debit" style={{ fontSize: '11px' }}>
                            {rec.book_name}
                          </span>
                          {!rec.is_active && (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '11px' }}>
                              Paused
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>Target Account: <strong style={{ color: 'var(--text-primary)' }}>{rec.account_name}</strong></span>
                          {rec.payer_merchant && <span>Payer: <strong style={{ color: 'var(--text-primary)' }}>{rec.payer_merchant}</strong></span>}
                          <span>Next Due: <strong style={{ color: '#34d399' }}>{rec.next_due_date || rec.start_date}</strong></span>
                          {rec.last_processed_date && <span>Last Posted: {rec.last_processed_date}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Income Amount</div>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                            +{formatCurrency(rec.amount, rec.currency_code, rec.currency_symbol)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}
                            onClick={() => handleProcessRecurringNow(rec)}
                            title="Post this income entry into the ledger now"
                          >
                            <CheckCircle2 size={13} />
                            <span>Post Now</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '12px' }}
                            onClick={() => handleToggleActiveRecurring(rec)}
                            title={rec.is_active ? 'Pause schedule' : 'Resume schedule'}
                          >
                            {rec.is_active ? <Pause size={13} /> : <Play size={13} color="#34d399" />}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '12px' }}
                            onClick={() => openEditRecurringModal(rec)}
                            title="Edit schedule details"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--danger-rose)' }}
                            onClick={() => handleDeleteRecurring(rec)}
                            title="Delete recurring schedule"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Institutions */}
      {activeTab === 'institutions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* List */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Configured Institutions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {institutions.map((inst) => (
                <div
                  key={inst.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 600 }}>{inst.name}</span>
                  </div>
                  <span className="badge badge-cash">{inst.country_code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add form */}
          <form
            onSubmit={handleAddInstitution}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Add New Bank / Institution</h3>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Barclays, Citibank, Standard Chartered"
                className="form-input"
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Country Code</label>
              <select className="form-select" value={newInstCountry} onChange={(e) => setNewInstCountry(e.target.value)}>
                <option value="IN">India (IN)</option>
                <option value="AE">United Arab Emirates (AE)</option>
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="EU">European Union (EU)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Save Bank</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Account Books */}
      {activeTab === 'books' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Account Books (Countries / Purposes)</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Manage separate ledgers for countries, travel, personal or business domains.
                </p>
              </div>
              <span className="badge" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
                {books.length} Book{books.length === 1 ? '' : 's'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {books.map((b) => {
                const accCount = b.accounts_count ?? accounts.filter((a) => a.book_id === b.id).length;
                const txCount = b.transactions_count ?? 0;
                return (
                  <div
                    key={b.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: b.is_default ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: b.is_default ? '0 0 15px rgba(16, 185, 129, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px' }}>{getBookBadge(b.name)}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>{b.name}</span>
                            {b.is_default ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                <Star size={11} fill="#10b981" />
                                Default Book
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            {b.description || 'No description provided'}
                          </div>
                        </div>
                      </div>

                      <span className="badge badge-cash" style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {b.currency_code} {b.currency_symbol ? `(${b.currency_symbol})` : ''}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span><strong>{accCount}</strong> accounts</span>
                        <span>•</span>
                        <span><strong>{txCount}</strong> transactions</span>
                        {b.sort_order ? (
                          <>
                            <span>•</span>
                            <span>Order #{b.sort_order}</span>
                          </>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!b.is_default && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                            onClick={() => handleSetBookDefault(b)}
                            title="Set as workspace default account book"
                          >
                            <Star size={12} />
                            <span>Set Default</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                          onClick={() => openEditBookModal(b)}
                          title="Edit Account Book"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            gap: '4px',
                            color: books.length <= 1 ? 'var(--text-muted)' : 'var(--danger)',
                            cursor: books.length <= 1 ? 'not-allowed' : 'pointer',
                            opacity: books.length <= 1 ? 0.4 : 1,
                          }}
                          disabled={books.length <= 1}
                          onClick={() => handleDeleteBook(b)}
                          title={books.length <= 1 ? 'Cannot delete the only account book' : 'Delete Account Book'}
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={handleAddBook}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Create New Account Book</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Add a new multi-currency ledger or purpose book for your workspace.
            </p>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Book Name</label>
              <input
                type="text"
                required
                placeholder="e.g. UK Relocation, Euro Summer Trip, Family Trust"
                className="form-input"
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Local Currency</label>
              <select className="form-select" value={newBookCurr} onChange={(e) => setNewBookCurr(e.target.value)}>
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Description / Purpose</label>
              <input
                type="text"
                placeholder="Purpose of this account book"
                className="form-input"
                value={newBookDesc}
                onChange={(e) => setNewBookDesc(e.target.value)}
              />
            </div>
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 12px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>Make Default Book</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Auto-select when opening app</div>
              </div>
              <input
                type="checkbox"
                checked={newBookIsDefault}
                onChange={(e) => setNewBookIsDefault(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Create Account Book</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Currencies & Exchange Rates */}
      {activeTab === 'currencies' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Currencies & Master Exchange Rates</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Exchange rates determine how local amounts in each book convert into the Master Reporting Base currency for consolidated analytics.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currencies.map((c) => (
              <div
                key={c.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: c.is_master_base ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>{c.code}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({c.symbol})</span>
                    {c.is_master_base ? (
                      <span className="badge badge-cash">Master Base Currency</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {c.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {!c.is_master_base && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1 {c.code} =</span>
                      <input
                        type="number"
                        step="0.01"
                        style={{ width: '90px' }}
                        className="form-input"
                        defaultValue={c.exchange_rate_to_master}
                        onBlur={(e) => handleUpdateRate(c.code, parseFloat(e.target.value) || 1.0)}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Master Units</span>
                    </div>
                  )}

                  {!c.is_master_base && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                      onClick={() => handleSetMasterCurrency(c.code)}
                    >
                      Make Master Base
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Categories (Main Heads & Sub Heads) */}
      {activeTab === 'categories' && (
        <div>
          {/* Header & Controls */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="var(--primary)" />
                  <span>General Ledger Heads & Sub Heads</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Configure your complete chart of accounts with hierarchical Main Heads (Expense Groups) and Sub Heads (Specific Categories). Not hardcoded — fully customizable!
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleResetCategories} title="Load standard template with Food, Car, House, Shopping, Entertainment, etc.">
                  <RotateCcw size={14} />
                  <span>Reset / Load Template</span>
                </button>
                <button className="btn btn-secondary" onClick={openCreateHeadModal}>
                  <FolderPlus size={14} />
                  <span>+ Main Head</span>
                </button>
                <button className="btn btn-primary" onClick={() => openCreateSubModal()}>
                  <Plus size={14} />
                  <span>+ Sub Head</span>
                </button>
              </div>
            </div>

            {/* Search and Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ position: 'relative', width: '280px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search heads or subheads..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>
                  Main Heads: <strong style={{ color: 'var(--text-primary)' }}>{categoryHeads.length}</strong>
                </span>
                <span>•</span>
                <span>
                  Sub Heads: <strong style={{ color: 'var(--text-primary)' }}>{categories.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Main Heads & Sub Heads List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categoryHeads.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <Layers size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No Categories Configured</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 16px' }}>
                  Get started immediately by loading the recommended General Ledger taxonomy (Food, Transport, House, Shopping, Entertainment, etc.) or create your own custom heads.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleResetCategories}>
                    <RotateCcw size={14} />
                    <span>Load Recommended Template</span>
                  </button>
                  <button className="btn btn-secondary" onClick={openCreateHeadModal}>
                    <Plus size={14} />
                    <span>Create Custom Main Head</span>
                  </button>
                </div>
              </div>
            ) : (
              categoryHeads
                .filter((head) => {
                  if (!catSearch) return true;
                  const term = catSearch.toLowerCase();
                  const matchHead = head.name.toLowerCase().includes(term);
                  const matchSub = (head.sub_heads || []).some((s) => s.name.toLowerCase().includes(term));
                  return matchHead || matchSub;
                })
                .map((head) => {
                  const isCollapsed = collapsedHeads[head.id];
                  const subs = (head.sub_heads || []).filter((s) => {
                    if (!catSearch) return true;
                    const term = catSearch.toLowerCase();
                    return s.name.toLowerCase().includes(term) || head.name.toLowerCase().includes(term);
                  });

                  return (
                    <div
                      key={head.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Main Head Header Card */}
                      <div
                        style={{
                          padding: '14px 18px',
                          background: 'var(--bg-surface-elevated)',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                          onClick={() => toggleCollapseHead(head.id)}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                          </button>

                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: head.color ? `${head.color}22` : 'var(--primary-subtle)',
                              border: `1px solid ${head.color || 'var(--primary)'}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                            }}
                          >
                            {head.icon || '📁'}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {head.name}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  background: 'var(--bg-app)',
                                  color: 'var(--text-secondary)',
                                  fontSize: '11px',
                                }}
                              >
                                {head.sub_heads?.length || 0} Sub Heads
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions on Main Head */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={() => openCreateSubModal(head.id)}
                            title="Add Sub Head under this Main Head"
                          >
                            <Plus size={13} />
                            <span>Add Sub Head</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px' }}
                            onClick={() => openEditHeadModal(head)}
                            title="Edit Main Head"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--danger-rose)' }}
                            onClick={() => handleDeleteHead(head)}
                            title="Delete Main Head"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Sub Heads Grid (Shown when not collapsed) */}
                      {!isCollapsed && (
                        <div style={{ padding: '16px 18px' }}>
                          {subs.length === 0 ? (
                            <div
                              style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '12px',
                                background: 'var(--bg-surface-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border-subtle)',
                              }}
                            >
                              No sub heads under this main head yet.{' '}
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                                onClick={() => openCreateSubModal(head.id)}
                              >
                                Create the first sub head
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '10px',
                              }}
                            >
                              {subs.map((sub) => (
                                <div
                                  key={sub.id}
                                  style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-surface-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: sub.color || head.color || '#10B981',
                                        flexShrink: 0,
                                      }}
                                    />
                                    {sub.icon && <span style={{ fontSize: '14px' }}>{sub.icon}</span>}
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          fontSize: '13px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={sub.name}
                                      >
                                        {sub.name}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: 'var(--radius-sm)',
                                      }}
                                      onClick={() => openEditSubModal(sub)}
                                      title="Edit Sub Head"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: 'var(--radius-sm)',
                                      }}
                                      onClick={() => handleDeleteSub(sub)}
                                      title="Delete Sub Head"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 0: EDIT ACCOUNT BOOK */}
      {/* ========================================================= */}
      {isEditBookModalOpen && editingBook && (
        <div className="modal-overlay" onClick={() => setIsEditBookModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                  <Edit2 size={16} />
                </div>
                <h2 className="modal-title">Edit Account Book: {editingBook.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditBookModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Book Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Land (India), UAE Expenses, US Travel"
                  className="form-input"
                  value={editBookName}
                  onChange={(e) => setEditBookName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Local Currency</label>
                <select
                  className="form-select"
                  value={editBookCurr}
                  onChange={(e) => setEditBookCurr(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
                {editBookCurr !== editingBook.currency_code && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      Changing currency from <strong>{editingBook.currency_code}</strong> to <strong>{editBookCurr}</strong> updates the base reporting currency for this book. Existing transactions retain their historical currencies.
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Description / Purpose</label>
                <textarea
                  rows={2}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  value={editBookDesc}
                  onChange={(e) => setEditBookDesc(e.target.value)}
                  placeholder="e.g. Household and personal spending in homeland"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Display Sort Order</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={editBookSortOrder}
                  onChange={(e) => setEditBookSortOrder(e.target.value)}
                />
              </div>

              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Default Account Book</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Automatically select this book when opening Centensor
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editBookIsDefault}
                  onChange={(e) => setEditBookIsDefault(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </div>

              {books.length > 1 && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '14px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--danger)' }}>
                      Delete this Account Book
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Permanently remove this book and its accounts, transactions &amp; budgets
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      color: 'var(--danger)',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      fontSize: '12px',
                      padding: '6px 12px',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleDeleteBook(editingBook)}
                  >
                    <Trash2 size={13} />
                    <span>Delete Book</span>
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditBookModalOpen(false)}
                  disabled={isSavingBook}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingBook}
                  style={{ minWidth: '120px' }}
                >
                  {isSavingBook ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT MASTER ACCOUNT WITH CONSEQUENCES ALERT */}
      {/* ========================================================= */}
      {isEditAccModalOpen && editingAccount && (
        <div className="modal-overlay" onClick={() => setIsEditAccModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                  <Edit2 size={16} />
                </div>
                <h2 className="modal-title">Edit Master Account: {editingAccount.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditAccModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="modal-body">
              {/* CONSEQUENCES ALERT CALLOUT */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '13px' }}>
                  <AlertTriangle size={17} />
                  <span>Important Master Account Impact Warning</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                  Modifying master account core properties directly affects your multi-country general ledger and historical balances:
                </p>
                <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', paddingLeft: '18px', lineHeight: 1.5 }}>
                  <li>
                    <strong style={{ color: 'var(--text-primary)' }}>Opening Balance:</strong> Changing this adjusts current balance by the delta and recalculates daily cash flow rollups.
                  </li>
                  <li>
                    <strong style={{ color: 'var(--text-primary)' }}>Currency / Account Book:</strong> Affects currency conversions and consolidated master book analytics for all linked transactions.
                  </li>
                  <li>
                    <strong style={{ color: 'var(--text-primary)' }}>Account Type:</strong> Modifies how payment methods route transactions (e.g. Bank Debit vs. Cash in Hand vs. Credit Card settlements).
                  </li>
                </ul>
              </div>

              {/* Dynamic live preview if opening balance changed */}
              {openingDiff !== 0 && (
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    New Computed Current Balance:
                  </span>
                  <strong style={{ color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(previewedCurrentBalance, editAccCurr, editingAccount.currency_symbol)} ({openingDiff > 0 ? `+${openingDiff}` : `${openingDiff}`})
                  </strong>
                </div>
              )}

              {/* Form Fields */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select className="form-select" value={editAccType} onChange={(e) => setEditAccType(e.target.value)}>
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Account</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="voucher">Voucher / Wallet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Linked Account Book</label>
                  <select className="form-select" value={editAccBookId} onChange={(e) => setEditAccBookId(parseInt(e.target.value, 10))}>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.currency_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Financial Institution</label>
                  <select className="form-select" value={editAccInstId} onChange={(e) => setEditAccInstId(e.target.value)}>
                    <option value="">-- None / Unlinked --</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.country_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={editAccCurr} onChange={(e) => setEditAccCurr(e.target.value)}>
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={editAccOpeningBalance}
                    onChange={(e) => setEditAccOpeningBalance(e.target.value)}
                  />
                </div>
                {editAccType === 'credit_card' ? (
                  <div className="form-group">
                    <label className="form-label">Credit Limit</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={editAccLimit}
                      onChange={(e) => setEditAccLimit(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Account No (Last 4 digits)</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      className="form-input"
                      value={editAccLast4}
                      onChange={(e) => setEditAccLast4(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {editAccType === 'credit_card' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Billing Cycle Day (1-31)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="form-input"
                      value={editAccBillingDay}
                      onChange={(e) => setEditAccBillingDay(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Card Number (Last 4 digits)</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 9876"
                      className="form-input"
                      value={editAccLast4}
                      onChange={(e) => setEditAccLast4(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Account Status</label>
                <select className="form-select" value={editAccIsActive} onChange={(e) => setEditAccIsActive(parseInt(e.target.value, 10))}>
                  <option value={1}>Active Account (Visible everywhere)</option>
                  <option value={0}>Inactive / Archived Account</option>
                </select>
              </div>

              {/* Explicit acknowledgment checkbox */}
              <div style={{ marginBottom: '18px', padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={accConsequencesAcknowledged}
                    onChange={(e) => setAccConsequencesAcknowledged(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
                  />
                  <span>
                    I acknowledge that modifying master account parameters recalculates ledger totals and balances accordingly.
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditAccModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Account Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: QUICK ACCOUNT TRANSFER */}
      {/* ========================================================= */}
      {isTransferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-sm)', color: '#a78bfa' }}>
                  <ArrowRightLeft size={16} />
                </div>
                <h2 className="modal-title">Account Transfer</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsTransferModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="modal-body">
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>From Source Account</span>
                    {srcTransferAcc && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Bal: {formatCurrency(srcTransferAcc.current_balance, srcTransferAcc.currency_code, srcTransferAcc.currency_symbol)}
                      </span>
                    )}
                  </label>
                  <select
                    className="form-select"
                    value={transferFromId}
                    onChange={(e) => {
                      const id = parseInt(e.target.value, 10);
                      setTransferFromId(id);
                      if (transferToId === id) {
                        const alt = accounts.find((a) => a.id !== id);
                        if (alt) setTransferToId(alt.id);
                      }
                    }}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.book_name}) • {formatCurrency(a.current_balance, a.currency_code, a.currency_symbol)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                    <ArrowRight size={14} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>To Destination Account</span>
                    {destTransferAcc && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Bal: {formatCurrency(destTransferAcc.current_balance, destTransferAcc.currency_code, destTransferAcc.currency_symbol)}
                      </span>
                    )}
                  </label>
                  <select
                    className="form-select"
                    value={transferToId}
                    onChange={(e) => setTransferToId(parseInt(e.target.value, 10))}
                  >
                    {accounts
                      .filter((a) => a.id !== transferFromId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.book_name}) • {formatCurrency(a.current_balance, a.currency_code, a.currency_symbol)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Transfer Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Amount ({srcTransferAcc?.currency_symbol || srcTransferAcc?.currency_code || 'INR'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="form-input"
                    style={{ fontSize: '16px', fontWeight: 700 }}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Transfer Reference / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly savings transfer, card payment"
                  className="form-input"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isTransferSubmitting} className="btn btn-primary">
                  {isTransferSubmitting ? 'Transferring...' : 'Execute Account Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CREATE / EDIT RECURRING INCOME */}
      {/* ========================================================= */}
      {isRecModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRecModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)', color: '#34d399' }}>
                  <Repeat size={16} />
                </div>
                <h2 className="modal-title">
                  {editingRec ? 'Edit Recurring Income Schedule' : 'Create Recurring Income Stream'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsRecModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="modal-body">
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Income Title / Source</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Salary, Villa Rental Income, Consulting Retainer"
                  className="form-input"
                  value={recName}
                  onChange={(e) => setRecName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Account Book</label>
                  <select
                    className="form-select"
                    value={recBookId}
                    onChange={(e) => {
                      const bId = parseInt(e.target.value, 10);
                      setRecBookId(bId);
                      const matching = accounts.find((a) => a.book_id === bId);
                      if (matching) setRecAccountId(matching.id);
                    }}
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.currency_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Credit To Account</label>
                  <select
                    className="form-select"
                    value={recAccountId}
                    onChange={(e) => setRecAccountId(parseInt(e.target.value, 10))}
                    required
                  >
                    {accounts
                      .filter((a) => a.book_id === recBookId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Recurring Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="form-input"
                    style={{ fontSize: '15px', fontWeight: 700 }}
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={recFrequency}
                    onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {recFrequency === 'monthly' || recFrequency === 'quarterly' || recFrequency === 'yearly' ? (
                  <div className="form-group">
                    <label className="form-label">Day of Month (1 - 31)</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="form-input"
                      value={recDayOfMonth}
                      onChange={(e) => setRecDayOfMonth(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Day of Week</label>
                    <select
                      className="form-select"
                      value={recDayOfWeek}
                      onChange={(e) => setRecDayOfWeek(parseInt(e.target.value, 10))}
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={recStartDate}
                    onChange={(e) => setRecStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Payer / Employer (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Google LLC, Tenant"
                    className="form-input"
                    value={recPayer}
                    onChange={(e) => setRecPayer(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GL Category (Optional)</label>
                  <select
                    className="form-select"
                    value={recCategoryId}
                    onChange={(e) => setRecCategoryId(e.target.value)}
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ''}{c.name} ({c.group_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Schedule Status</label>
                <select
                  className="form-select"
                  value={recIsActive}
                  onChange={(e) => setRecIsActive(parseInt(e.target.value, 10))}
                >
                  <option value={1}>Active (Scheduled)</option>
                  <option value={0}>Paused</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRecModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRec ? 'Update Schedule' : 'Save Recurring Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: CREATE / EDIT MAIN HEAD */}
      {/* ========================================================= */}
      {isHeadModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHeadModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingHead ? 'Edit Main Head' : 'Add New Main Head'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsHeadModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHead} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Main Head Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🍔 Food / Eating out, 🚗 Car / Transport"
                  className="form-input"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Emoji / Icon</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={headIcon}
                    onChange={(e) => setHeadIcon(e.target.value)}
                    style={{ width: '80px', fontSize: '18px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    Pick or type an emoji:
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['🍔', '🚗', '🏠', '🛒', '🎬', '💊', '📞', '✈️', '🐾', '👚', '❓', '🎁', '📚', '🏛️', '💰', '👶', '💼', '☕', '💡', '🔧'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setHeadIcon(emoji)}
                      style={{
                        padding: '6px 8px',
                        background: headIcon === emoji ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
                        border: headIcon === emoji ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Accent Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {[
                    '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#A855F7',
                    '#EF4444', '#06B6D4', '#0EA5E9', '#F97316', '#D946EF',
                    '#64748B', '#14B8A6', '#84CC16', '#EAB308', '#F43F5E'
                  ].map((clr) => (
                    <div
                      key={clr}
                      onClick={() => setHeadColor(clr)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: clr,
                        cursor: 'pointer',
                        border: headColor === clr ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: headColor === clr ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsHeadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHead ? 'Save Changes' : 'Create Main Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: CREATE / EDIT SUB HEAD */}
      {/* ========================================================= */}
      {isSubModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSubModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingSub ? 'Edit Sub Head' : 'Add New Sub Head'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsSubModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubHead} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Parent Main Head</label>
                <select
                  className="form-select"
                  value={subHeadId}
                  onChange={(e) => {
                    const hId = Number(e.target.value);
                    setSubHeadId(hId);
                    const selHead = categoryHeads.find((h) => h.id === hId);
                    if (selHead && selHead.color) {
                      setSubColor(selHead.color);
                    }
                  }}
                  required
                >
                  <option value="">-- Select Main Head --</option>
                  {categoryHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.icon} {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Sub Head Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Groceries, Restaurants, Fast food"
                  className="form-input"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Icon / Emoji</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={subIcon}
                    onChange={(e) => setSubIcon(e.target.value)}
                    style={{ width: '80px', fontSize: '18px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    Emoji representing this specific sub-head
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Color Indicator</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {[
                    '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#A855F7',
                    '#EF4444', '#06B6D4', '#0EA5E9', '#F97316', '#D946EF',
                    '#64748B', '#14B8A6', '#84CC16', '#EAB308', '#F43F5E'
                  ].map((clr) => (
                    <div
                      key={clr}
                      onClick={() => setSubColor(clr)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: clr,
                        cursor: 'pointer',
                        border: subColor === clr ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: subColor === clr ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSubModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSub ? 'Save Changes' : 'Create Sub Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: CREATE / EDIT INCOME STREAM DEFINITION */}
      {/* ========================================================= */}
      {isIncTypeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIncTypeModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="#10b981" />
                </div>
                <h2 className="modal-title">
                  {editingIncType ? `Edit Stream: ${editingIncType.label}` : 'Create New Income Stream'}
                </h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsIncTypeModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveIncomeType} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Stream Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Farm / Agricultural Income"
                    className="form-input"
                    value={incLabel}
                    onChange={(e) => {
                      setIncLabel(e.target.value);
                      if (!editingIncType && !incShortLabel) {
                        setIncShortLabel(e.target.value.split('/')[0].trim().slice(0, 12));
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Short Badge Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Farm"
                    className="form-input"
                    value={incShortLabel}
                    onChange={(e) => setIncShortLabel(e.target.value)}
                  />
                </div>
              </div>

              {!editingIncType && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">System Type Key (Slug identifier)</label>
                  <input
                    type="text"
                    placeholder="e.g. farm, petty_hand_loan, stock_dividend"
                    className="form-input"
                    value={incTypeKey}
                    onChange={(e) => setIncTypeKey(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Lowercase letters, numbers, and underscores. Auto-derived if left empty.
                  </span>
                </div>
              )}

              {/* Emoji and Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Icon / Emoji</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={incIcon}
                      onChange={(e) => setIncIcon(e.target.value)}
                      style={{ fontSize: '18px', textAlign: 'center', width: '60px' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {['🤝', '🌾', '📈', '🏦', '💼', '🏠', '🎁', '💸', '💰', '🪙'].map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => setIncIcon(emo)}
                          style={{
                            padding: '4px',
                            background: incIcon === emo ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
                            border: incIcon === emo ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Stream Color</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {[
                      '#10B981', '#059669', '#14B8A6', '#06B6D4', '#3B82F6',
                      '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F59E0B',
                      '#F97316', '#EF4444', '#64748B'
                    ].map((clr) => (
                      <div
                        key={clr}
                        onClick={() => setIncColor(clr)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: clr,
                          cursor: 'pointer',
                          border: incColor.toLowerCase() === clr.toLowerCase() ? '2px solid #ffffff' : '2px solid transparent',
                          boxShadow: incColor.toLowerCase() === clr.toLowerCase() ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Description / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Income from paddy, harvest, dairy, livestock, or agricultural leases"
                  className="form-input"
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                />
              </div>

              {/* Payer and Placeholder customization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Payer Label in Modal</label>
                  <input
                    type="text"
                    placeholder="e.g. Friend / Lender Name, Buyer Name"
                    className="form-input"
                    value={incPayerLabel}
                    onChange={(e) => setIncPayerLabel(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payer Input Placeholder</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex, Rahul, or Market Name"
                    className="form-input"
                    value={incPayerPlaceholder}
                    onChange={(e) => setIncPayerPlaceholder(e.target.value)}
                  />
                </div>
              </div>

              {/* Default Subcategories */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Subcategories / Crop Types / Categories</label>
                <input
                  type="text"
                  placeholder="Paddy / Rice, Coconut, Vegetables, Dairy (comma separated)"
                  className="form-input"
                  value={incSubcategoriesText}
                  onChange={(e) => setIncSubcategoriesText(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Enter categories separated by commas. Users will see these in category dropdowns.
                </span>
              </div>

              {/* Status */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Stream Status</label>
                <select
                  className="form-select"
                  value={incIsActive}
                  onChange={(e) => setIncIsActive(parseInt(e.target.value, 10))}
                >
                  <option value={1}>Active (Visible in Quick Income Presets)</option>
                  <option value={0}>Disabled / Hidden</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsIncTypeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
                  {editingIncType ? 'Save Changes' : 'Create Income Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
