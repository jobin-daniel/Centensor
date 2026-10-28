'use client';

import React, { useState, useEffect } from 'react';
import MonthlyBudgetManager from '@/components/budget/MonthlyBudgetManager';
import { AccountBook } from '@/lib/types';

export default function BudgetPage() {
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [activeBookId, setActiveBookId] = useState<number>(1);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);

  useEffect(() => {
    async function loadBooks() {
      try {
        const res = await fetch('/api/books');
        const json = await res.json();
        if (json.success && json.books.length > 0) {
          setBooks(json.books);
          const defaultBook = json.books.find((b: AccountBook) => b.is_default) || json.books[0];
          setActiveBookId(defaultBook.id);
        }
      } catch (e) {
        console.error('Error loading books on budget page:', e);
      }
    }
    loadBooks();
  }, []);

  return (
    <MonthlyBudgetManager
      books={books}
      activeBookId={activeBookId}
      year={year}
      month={month}
      onBookChange={(bId) => setActiveBookId(bId)}
      onMonthChange={(y, m) => {
        setYear(y);
        setMonth(m);
      }}
    />
  );
}
