'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Trash2, Plus, Calendar, CreditCard, Wallet, Banknote, Pencil } from 'lucide-react';
import { Category, MatrixCellData, Account, PaymentMethod, Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface CellDetailModalProps {
  category: Category;
  cell: MatrixCellData;
  bookId: number;
  currencyCode: string;
  currencySymbol?: string;
  accounts: Account[];
  categories?: Category[];
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
  categories,
  onClose,
  onRefresh,
}: CellDetailModalProps) {
  // Local list of transactions and state tracking for in-modal updates
  const [transactions, setTransactions] = useState<Transaction[]>(cell.transactions || []);
  const [hasChanged, setHasChanged] = useState(false);

  // Available categories for category selection
  const [availableCategories, setAvailableCategories] = useState<Category[]>(() => {
    if (categories && categories.length > 0) return categories;
    return [category];
  });

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories(categories);
      return;
    }
    let ignore = false;
    async function loadCats() {
      try {
        const res = await fetch(`/api/categories?bookId=${bookId}`);
        const json = await res.json();
        if (!ignore && json.success && Array.isArray(json.categories)) {
          setAvailableCategories(json.categories);
        }
      } catch (err) {
        console.error('Failed to load categories for modal:', err);
      }
    }
    loadCats();
    return () => {
      ignore = true;
    };
  }, [bookId, categories]);

  // Group available categories by group_name for clean optgroup select
  const groupedCategories = useMemo(() => {
    const groups: { [name: string]: Category[] } = {};
    availableCategories.forEach((c) => {
      const gName = c.group_name || 'General';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(c);
    });
    return Object.entries(groups).map(([name, items]) => ({
      name,
      items,
    }));
  }, [availableCategories]);

  // Derive total amount dynamically
  const totalAmount = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [transactions]);

  // Form state for adding new expense
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [accountId, setAccountId] = useState<number>(() => {
    const cashAcc = accounts.find((a) => a.type === 'cash');
    return cashAcc ? cashAcc.id : accounts[0]?.id || 1;
  });
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Edit state for existing transactions
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<number>(category.id);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('cash');
  const [editAccountId, setEditAccountId] = useState<number>(1);
  const [editDescription, setEditDescription] = useState<string>('');

  // Close handler: if changes occurred in-place, refresh worksheet on close
  const handleModalClose = () => {
    if (hasChanged) {
      onRefresh();
    } else {
      onClose();
    }
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanged]);

  // Filter accounts matching chosen payment method
  const relevantAccounts = accounts.filter((a) => {
    if (paymentMethod === 'cash') return a.type === 'cash';
    if (paymentMethod === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
    if (paymentMethod === 'credit_card') return a.type === 'credit_card';
    return true;
  });

  const relevantEditAccounts = accounts.filter((a) => {
    if (editPaymentMethod === 'cash') return a.type === 'cash';
    if (editPaymentMethod === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
    if (editPaymentMethod === 'credit_card') return a.type === 'credit_card';
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

  const handleEditPaymentMethodChange = (pm: PaymentMethod) => {
    setEditPaymentMethod(pm);
    const matching = accounts.find((a) => {
      if (pm === 'cash') return a.type === 'cash';
      if (pm === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
      if (pm === 'credit_card') return a.type === 'credit_card';
      return false;
    });
    if (matching) setEditAccountId(matching.id);
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditAmount(String(tx.amount));
    setEditDate(tx.date || cell.date);
    setEditCategoryId(tx.category_id || category.id);
    setEditPaymentMethod(tx.payment_method);
    setEditAccountId(tx.account_id);
    setEditDescription(tx.description || tx.merchant || '');
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    setEditAmount('');
    setEditDate('');
    setEditCategoryId(category.id);
    setEditDescription('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(editAmount);
    if (!editingTxId || !editAmount || isNaN(parsedAmount) || parsedAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTxId,
          date: editDate || cell.date,
          category_id: editCategoryId,
          amount: parsedAmount,
          payment_method: editPaymentMethod,
          account_id: editAccountId,
          description: editDescription.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const dateChanged = editDate && editDate !== cell.date;
        const categoryChanged = editCategoryId !== category.id;

        if (dateChanged || categoryChanged) {
          // If the date or category changed, remove from this cell's transactions list
          setTransactions((prev) => prev.filter((tx) => tx.id !== editingTxId));
        } else {
          // Keep in this cell's transactions list with updated fields
          const updatedTx = data.transaction || {
            id: editingTxId,
            date: editDate || cell.date,
            category_id: editCategoryId,
            amount: parsedAmount,
            payment_method: editPaymentMethod,
            account_id: editAccountId,
            description: editDescription.trim() || undefined,
          };
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.id === editingTxId
                ? {
                    ...tx,
                    ...updatedTx,
                    account_name: accounts.find((a) => a.id === editAccountId)?.name || tx.account_name,
                  }
                : tx
            )
          );
        }
        setHasChanged(true);
        setEditingTxId(null);
      } else {
        alert(data.error || 'Failed to update expense');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          date: cell.date,
          amount: parsedAmount,
          category_id: category.id,
          account_id: accountId,
          payment_method: paymentMethod,
          type: 'expense',
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.transaction) {
        const newTx: Transaction = {
          ...data.transaction,
          account_name: accounts.find((a) => a.id === accountId)?.name || 'Account',
        };

        if (keepOpen) {
          setTransactions((prev) => [newTx, ...prev]);
          setHasChanged(true);
          setAmount('');
          setDescription('');
          setTimeout(() => {
            amountInputRef.current?.focus();
          }, 50);
        } else {
          onRefresh();
        }
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
        setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
        setHasChanged(true);
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting transaction');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleModalClose}>
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
          <button className="modal-close-btn" onClick={handleModalClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Day Total & Summary Banner */}
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
                Total for Day {cell.day}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(totalAmount, currencyCode, currencySymbol)}
              </div>
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {transactions.length} {transactions.length === 1 ? 'expense' : 'expenses'} logged
            </div>
          </div>

          {/* Quick Add Expense Form - Always Visible in the Single Popup */}
          <form
            onSubmit={(e) => handleAddExpense(e, false)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
              <Plus size={16} />
              <span>Add New Expense</span>
            </div>

            {/* Amount */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Amount ({currencySymbol || currencyCode})
              </label>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                className="form-input"
                style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Payment Method Toggle */}
            <div className="form-group" style={{ marginBottom: 0 }}>
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

            {/* Paid From Account */}
            <div className="form-group" style={{ marginBottom: 0 }}>
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description / Merchant (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Supermarket, Coffee, Taxi"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 14px' }}
              >
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleAddExpense(e, true)}
                className="btn btn-secondary"
                style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}
                title="Save this expense and keep modal open to add another"
              >
                Save & Add Another
              </button>
            </div>
          </form>

          {/* List of itemized transactions */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Itemized Transactions ({transactions.length})
            </div>

            {transactions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                No previous expenses logged for this category on Day {cell.day}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {transactions.map((tx) =>
                  editingTxId === tx.id ? (
                    <form
                      key={tx.id}
                      onSubmit={handleSaveEdit}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '14px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                          Edit Expense
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Amount & Date in 2-Column Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>
                            Amount ({currencySymbol || currencyCode})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            autoFocus
                            className="form-input"
                            style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '6px 10px' }}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Date</label>
                          <input
                            type="date"
                            required
                            className="form-input"
                            style={{ fontSize: '13px', padding: '6px 10px' }}
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Category Selection */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Category</label>
                        <select
                          className="form-select"
                          style={{ fontSize: '13px', padding: '7px 10px' }}
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(parseInt(e.target.value, 10))}
                        >
                          {groupedCategories.map((grp) => (
                            <optgroup key={grp.name} label={grp.name}>
                              {grp.items.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon ? `${c.icon} ` : ''}{c.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method Toggle */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '11px' }}>Payment Method</label>
                        <div className="payment-toggle-group">
                          <button
                            type="button"
                            className={`payment-toggle-btn ${editPaymentMethod === 'cash' ? 'active cash' : ''}`}
                            onClick={() => handleEditPaymentMethodChange('cash')}
                            style={{ padding: '6px' }}
                          >
                            <Wallet size={12} />
                            <span style={{ fontSize: '11px' }}>Cash</span>
                          </button>
                          <button
                            type="button"
                            className={`payment-toggle-btn ${editPaymentMethod === 'debit_card' ? 'active debit' : ''}`}
                            onClick={() => handleEditPaymentMethodChange('debit_card')}
                            style={{ padding: '6px' }}
                          >
                            <Banknote size={12} />
                            <span style={{ fontSize: '11px' }}>Debit</span>
                          </button>
                          <button
                            type="button"
                            className={`payment-toggle-btn ${editPaymentMethod === 'credit_card' ? 'active credit' : ''}`}
                            onClick={() => handleEditPaymentMethodChange('credit_card')}
                            style={{ padding: '6px' }}
                          >
                            <CreditCard size={12} />
                            <span style={{ fontSize: '11px' }}>Credit</span>
                          </button>
                        </div>
                      </div>

                      {/* Paid From Account & Description */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Paid From Account</label>
                          <select
                            className="form-select"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            value={editAccountId}
                            onChange={(e) => setEditAccountId(parseInt(e.target.value, 10))}
                          >
                            {relevantEditAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '11px' }}>Description / Merchant</label>
                          <input
                            type="text"
                            placeholder="Optional note"
                            className="form-input"
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleStartEdit(tx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Edit expense"
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
                            padding: '6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
