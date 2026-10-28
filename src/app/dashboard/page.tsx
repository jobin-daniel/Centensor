'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import ExpensesDashboard from '@/components/dashboard/ExpensesDashboard';
import TransactionModal from '@/components/transactions/TransactionModal';
import { AccountBook, Account, Category, Transaction } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function DashboardStandalonePage() {
  const router = useRouter();
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<number>(1);
  const [year, setYear] = useState<number>(2015);
  const [month, setMonth] = useState<number>(1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
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
        if (mdJson.success) setAccounts(mdJson.data.accounts);
        if (catJson.success) setCategories(catJson.categories);
      } catch (e) {
        console.error(e);
      }
    };
    loadInitialData();
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        books={books}
        activeBookId={activeBookId}
        onSelectBook={(id) => setActiveBookId(id)}
        year={year}
        month={month}
        onMonthChange={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
        onOpenNewTxModal={() => setIsTxModalOpen(true)}
      />

      <Navigation
        activeTab="dashboard"
        onTabChange={(t) => {
          if (t === 'dashboard') return;
          router.push('/');
        }}
        currencyCode={activeBook?.currency_code}
      />

      <main style={{ flex: 1 }}>
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
          onEditTransaction={(tx) => setEditingTransaction(tx)}
        />
      </main>

      {isTxModalOpen && (
        <TransactionModal
          books={books}
          activeBookId={activeBookId}
          accounts={accounts}
          categories={categories}
          onClose={() => setIsTxModalOpen(false)}
          onSuccess={() => {
            setIsTxModalOpen(false);
          }}
        />
      )}

      {editingTransaction && (
        <TransactionModal
          books={books}
          activeBookId={editingTransaction.book_id || activeBookId}
          accounts={accounts}
          categories={categories}
          editTransaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => {
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
}
