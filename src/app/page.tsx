'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Navigation, { NavTabType } from '@/components/Navigation';
import KPISummaryCards from '@/components/KPISummaryCards';
import WorksheetGrid from '@/components/worksheet/WorksheetGrid';
import TransactionModal from '@/components/transactions/TransactionModal';
import ExpensesDashboard from '@/components/dashboard/ExpensesDashboard';
import MasterBookPage from './master-book/page';
import LedgerPage from './ledger/page';
import SettingsPage from './settings/page';
import { AccountBook, Account, Category, MonthlyWorksheetData } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTabType>('dashboard');
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<number>(1);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);

  const [worksheetData, setWorksheetData] = useState<MonthlyWorksheetData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);

  // Load books, accounts, and categories
  const loadInitialData = async () => {
    try {
      const [booksRes, mdRes, catRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/master-data'),
        fetch('/api/categories'),
      ]);
      const [booksJson, mdJson, catJson] = await Promise.all([
        booksRes.json(),
        mdRes.json(),
        catRes.json(),
      ]);

      if (booksJson.success && booksJson.books.length > 0) {
        setBooks(booksJson.books);
        const defaultBook = booksJson.books.find((b: AccountBook) => b.is_default) || booksJson.books[0];
        setActiveBookId(defaultBook.id);
      }
      if (mdJson.success) {
        setAccounts(mdJson.data.accounts);
      }
      if (catJson.success) {
        setCategories(catJson.categories);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load worksheet data
  const loadWorksheet = async () => {
    if (!activeBookId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/worksheet?bookId=${activeBookId}&year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success) {
        setWorksheetData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [booksRes, mdRes, catRes] = await Promise.all([
          fetch('/api/books'),
          fetch('/api/master-data'),
          fetch('/api/categories'),
        ]);
        const [booksJson, mdJson, catJson] = await Promise.all([
          booksRes.json(),
          mdRes.json(),
          catRes.json(),
        ]);
        if (!ignore) {
          if (booksJson.success && booksJson.books.length > 0) {
            setBooks(booksJson.books);
            const defaultBook = booksJson.books.find((b: AccountBook) => b.is_default) || booksJson.books[0];
            setActiveBookId(defaultBook.id);
          }
          if (mdJson.success) setAccounts(mdJson.data.accounts);
          if (catJson.success) setCategories(catJson.categories);
        }
      } catch (e) {
        console.error(e);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function fetchWorksheet() {
      if (!activeBookId || activeTab !== 'worksheet') return;
      try {
        const res = await fetch(`/api/worksheet?bookId=${activeBookId}&year=${year}&month=${month}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setWorksheetData(json.data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!ignore) setLoading(false);
      }
    }
    fetchWorksheet();
    return () => {
      ignore = true;
    };
  }, [activeBookId, year, month, activeTab]);

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <Header
        books={books}
        activeBookId={activeBookId}
        onSelectBook={(id) => {
          setActiveBookId(id);
        }}
        year={year}
        month={month}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        onOpenNewTxModal={() => setIsTxModalOpen(true)}
      />

      {/* Sub Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        currencyCode={activeBook?.currency_code}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <ExpensesDashboard
            books={books}
            activeBookId={activeBookId}
            year={year}
            month={month}
            onYearChange={(y) => setYear(y)}
            onMonthChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
            onBookChange={(bId) => setActiveBookId(bId)}
            onOpenNewTxModal={() => setIsTxModalOpen(true)}
          />
        )}

        {activeTab === 'worksheet' && (
          <div className="container" style={{ paddingTop: '20px' }}>
            {worksheetData && <KPISummaryCards data={worksheetData} />}

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading Worksheet Grid...
              </div>
            ) : worksheetData ? (
              <WorksheetGrid
                data={worksheetData}
                accounts={accounts.filter((a) => a.book_id === activeBookId)}
                onRefresh={loadWorksheet}
              />
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No worksheet data available.
              </div>
            )}
          </div>
        )}

        {activeTab === 'ledger' && <LedgerPage />}

        {activeTab === 'master_book' && <MasterBookPage />}

        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Quick Add Transaction Modal */}
      {isTxModalOpen && (
        <TransactionModal
          books={books}
          activeBookId={activeBookId}
          accounts={accounts}
          categories={categories}
          onClose={() => setIsTxModalOpen(false)}
          onSuccess={() => {
            setIsTxModalOpen(false);
            loadWorksheet();
          }}
        />
      )}
    </div>
  );
}
