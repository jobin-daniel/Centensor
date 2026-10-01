'use client';

import React, { useState } from 'react';
import { X, Trash2, Plus, Calendar, Tag, CreditCard, Wallet, Banknote } from 'lucide-react';
import { Category, MatrixCellData, Account, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface CellDetailModalProps {
  category: Category;
  cell: MatrixCellData;
  bookId: number;
  currencyCode: string;
  currencySymbol?: string;
  accounts: Account[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function CellDetailModal({
  category,
  cell,
  bookId,
  currencyCode,
  currencySymbol,
  accounts,
  onClose,
  onRefresh,
}: CellDetailModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState<number>(() => {
    const cashAcc = accounts.find((a) => a.type === 'cash');
    return cashAcc ? cashAcc.id : accounts[0]?.id || 1;
  });
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter accounts matching chosen payment method
  const relevantAccounts = accounts.filter((a) => {
    if (paymentMethod === 'cash') return a.type === 'cash';
    if (paymentMethod === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
    if (paymentMethod === 'credit_card') return a.type === 'credit_card';
    return true;
  });

  const handlePaymentMethodChange = (pm: PaymentMethod) => {
    setPaymentMethod(pm);
    const matching = accounts.find((a) => {
      if (pm === 'cash') return a.type === 'cash';
      if (pm === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
      if (pm === 'credit_card') return a.type === 'credit_card';
      return false;
    });
    if (matching) setAccountId(matching.id);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          date: cell.date,
          amount: parseFloat(amount),
          category_id: category.id,
          account_id: accountId,
          payment_method: paymentMethod,
          type: 'expense',
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAmount('');
        setDescription('');
        setIsAdding(false);
        onRefresh();
      } else {
        alert(data.error || 'Failed to add expense');
      }
    } catch (err) {
      console.error(err);
      alert('Network error adding expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (txId: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${txId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting transaction');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: category.color || 'var(--primary)',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {category.group_name}
              </span>
            </div>
            <h2 className="modal-title">{category.name}</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Calendar size={14} />
              <span>Day {cell.day} ({cell.date})</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Day Total Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Total for this Day
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(cell.totalAmount, currencyCode, currencySymbol)}
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus size={14} />
              <span>{isAdding ? 'Cancel' : 'Add Expense'}</span>
            </button>
          </div>

          {/* Quick Add Expense Form */}
          {isAdding && (
            <form
              onSubmit={handleAddExpense}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                Add New Expense on {cell.date}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Amount ({currencySymbol || currencyCode})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  className="form-input"
                  style={{ fontSize: '16px', fontWeight: 700 }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Payment Method Toggle */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div className="payment-toggle-group">
                  <button
                    type="button"
                    className={`payment-toggle-btn ${paymentMethod === 'cash' ? 'active cash' : ''}`}
                    onClick={() => handlePaymentMethodChange('cash')}
                  >
                    <Wallet size={14} />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-toggle-btn ${paymentMethod === 'debit_card' ? 'active debit' : ''}`}
                    onClick={() => handlePaymentMethodChange('debit_card')}
                  >
                    <Banknote size={14} />
                    <span>Debit / Bank</span>
                  </button>
                  <button
                    type="button"
                    className={`payment-toggle-btn ${paymentMethod === 'credit_card' ? 'active credit' : ''}`}
                    onClick={() => handlePaymentMethodChange('credit_card')}
                  >
                    <CreditCard size={14} />
                    <span>Credit Card</span>
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="form-group">
                <label className="form-label">Paid From Account</label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
                >
                  {relevantAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description / Merchant</label>
                <input
                  type="text"
                  placeholder="e.g. Supermarket, Snacks, Petrol"
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '4px' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </button>
            </form>
          )}

          {/* List of itemized transactions */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Itemized Transactions ({cell.transactions.length})
            </div>

            {cell.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No expenses logged for this category on Day {cell.day}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cell.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(tx.amount, currencyCode, currencySymbol)}
                        </span>
                        <span
                          className={`badge ${
                            tx.payment_method === 'cash'
                              ? 'badge-cash'
                              : tx.payment_method === 'credit_card'
                              ? 'badge-credit'
                              : 'badge-debit'
                          }`}
                        >
                          {tx.payment_method === 'cash' ? 'Cash' : tx.payment_method === 'credit_card' ? 'Credit Card' : 'Debit'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {tx.description || tx.account_name || 'Expense'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(tx.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      title="Delete expense"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
