'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import IncomeManager from '@/components/income/IncomeManager';
import TransactionModal from '@/components/transactions/TransactionModal';
import { AccountBook, Account, Category } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function IncomeStandalonePage() {
  const router = useRouter();
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<number>(1);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadInitialData() {
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
        console.error('Error loading initial data on income page:', e);
      }
    }
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
        activeTab="income"
        onTabChange={(t) => {
          if (t === 'income') return;
          router.push('/');
        }}
        currencyCode={activeBook?.currency_code}
      />

      <main style={{ flex: 1 }}>
        <IncomeManager
          books={books}
          activeBookId={activeBookId}
          year={year}
          month={month}
          accounts={accounts}
          onBookChange={(bId) => setActiveBookId(bId)}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
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
    </div>
  );
}
