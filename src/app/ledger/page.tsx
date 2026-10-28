'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Filter, Receipt, Pencil } from 'lucide-react';
import { Transaction, AccountBook, Category, Account } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import TransactionModal from '@/components/transactions/TransactionModal';

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, booksRes, catRes, masterRes] = await Promise.all([
        fetch(`/api/transactions?limit=200${selectedBookId ? `&bookId=${selectedBookId}` : ''}${selectedCategoryId ? `&categoryId=${selectedCategoryId}` : ''}${selectedMethod ? `&paymentMethod=${selectedMethod}` : ''}`),
        fetch('/api/books'),
        fetch('/api/categories'),
        fetch('/api/master-data'),
      ]);

      const [txJson, booksJson, catJson, masterJson] = await Promise.all([
        txRes.json(),
        booksRes.json(),
        catRes.json(),
        masterRes.json(),
      ]);

      if (txJson.success) setTransactions(txJson.transactions);
      if (booksJson.success) setBooks(booksJson.books);
      if (catJson.success) setCategories(catJson.categories);
      if (masterJson.success && masterJson.accounts) setAccounts(masterJson.accounts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [txRes, booksRes, catRes, masterRes] = await Promise.all([
          fetch(
            `/api/transactions?limit=200${selectedBookId ? `&bookId=${selectedBookId}` : ''}${
              selectedCategoryId ? `&categoryId=${selectedCategoryId}` : ''
            }${selectedMethod ? `&paymentMethod=${selectedMethod}` : ''}`
          ),
          fetch('/api/books'),
          fetch('/api/categories'),
          fetch('/api/master-data'),
        ]);

        const [txJson, booksJson, catJson, masterJson] = await Promise.all([
          txRes.json(),
          booksRes.json(),
          catRes.json(),
          masterRes.json(),
        ]);

        if (!ignore) {
          if (txJson.success) setTransactions(txJson.transactions);
          if (booksJson.success) setBooks(booksJson.books);
          if (catJson.success) setCategories(catJson.categories);
          if (masterJson.success && masterJson.accounts) setAccounts(masterJson.accounts);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [selectedBookId, selectedCategoryId, selectedMethod]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Failed to delete');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting transaction');
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Date', 'Book', 'Type', 'Amount', 'Currency', 'Payment Method', 'Account', 'Category', 'Description'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      `"${t.book_name || ''}"`,
      t.type,
      t.amount,
      t.currency_code,
      t.payment_method,
      `"${t.account_name || ''}"`,
      `"${t.category_name || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Centensor_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Search filter
  const filtered = transactions.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.category_name && t.category_name.toLowerCase().includes(term)) ||
      (t.account_name && t.account_name.toLowerCase().includes(term)) ||
      (t.merchant && t.merchant.toLowerCase().includes(term)) ||
      t.date.includes(term)
    );
  });

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Title & Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
              <Receipt size={20} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Transactions Ledger</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Comprehensive chronological register of all expenses, withdrawals, and settlements across all books.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleExportCSV}>
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-surface)',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search description, payee, category..."
            className="form-input"
            style={{ width: '100%', paddingLeft: '36px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Book Filter */}
        <select
          className="form-select"
          style={{ width: '180px' }}
          value={selectedBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
        >
          <option value="">All Account Books</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.currency_code})
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          className="form-select"
          style={{ width: '200px' }}
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="">All Categories</option>
          {Array.from(new Set(categories.map((c) => c.group_name))).map((grp) => {
            const grpCats = categories.filter((c) => c.group_name === grp);
            return (
              <optgroup key={grp} label={grp}>
                {grpCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        {/* Payment Method / Type Filter */}
        <select
          className="form-select"
          style={{ width: '170px' }}
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
        >
          <option value="">All Types & Methods</option>
          <option value="cash">Cash in Hand</option>
          <option value="debit_card">Debit / Bank</option>
          <option value="credit_card">Credit Card</option>
          <option value="transfer">Account Transfer</option>
          <option value="income">Income</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Book</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Type / Method</th>
                <th style={{ padding: '12px 16px' }}>Account</th>
                <th style={{ padding: '12px 16px' }}>Description / Merchant</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600 }}>{tx.date}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-cash" style={{ fontSize: '11px' }}>
                        {tx.book_name || 'Book'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {tx.category_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tx.category_color || 'var(--primary)' }} />
                          <span>{tx.category_name}</span>
                        </div>
                      ) : tx.type === 'income' ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>💰 Income</span>
                      ) : tx.type === 'transfer' ? (
                        <span style={{ color: '#8b5cf6', fontWeight: 600 }}>🔄 Transfer</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{tx.type}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {tx.type === 'transfer' ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#a78bfa',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          Account Transfer
                        </span>
                      ) : tx.type === 'income' ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Income
                        </span>
                      ) : (
                        <span
                          className={`badge ${
                            tx.payment_method === 'cash'
                              ? 'badge-cash'
                              : tx.payment_method === 'credit_card'
                              ? 'badge-credit'
                              : 'badge-debit'
                          }`}
                        >
                          {tx.type === 'bank_withdrawal'
                            ? 'Bank Cash In'
                            : tx.type === 'card_settlement'
                            ? 'Card Settlement'
                            : tx.payment_method === 'cash'
                            ? 'Cash'
                            : tx.payment_method === 'credit_card'
                            ? 'Credit Card'
                            : 'Debit'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {tx.type === 'transfer' ? (
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {tx.account_name} <span style={{ color: '#8b5cf6' }}>➔</span> {tx.to_account_name || 'Dest'}
                        </span>
                      ) : tx.type === 'bank_withdrawal' || tx.type === 'card_settlement' ? (
                        <span>
                          {tx.account_name} ➔ {tx.to_account_name || 'Target'}
                        </span>
                      ) : (
                        tx.account_name || 'Account'
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{tx.description || '-'}</div>
                      {tx.merchant && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.merchant}</div>}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: tx.type === 'income' ? '#34d399' : tx.type === 'transfer' ? '#a78bfa' : 'var(--text-primary)',
                      }}
                      className="tabular-nums"
                    >
                      {tx.type === 'income' ? '+ ' : ''}
                      {formatCurrency(tx.amount, tx.currency_code, tx.currency_symbol)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setEditingTransaction(tx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Edit transaction"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingTransaction && (
        <TransactionModal
          books={books}
          activeBookId={editingTransaction.book_id || (books[0]?.id || 1)}
          accounts={accounts}
          categories={categories}
          editTransaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => {
            setEditingTransaction(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
