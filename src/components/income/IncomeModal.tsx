'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Repeat, Clock } from 'lucide-react';
import { AccountBook, Account, Transaction, IncomeStreamDefinition } from '@/lib/types';
import { INCOME_STREAM_DEFINITIONS, getIncomeStreamDef } from '@/lib/income-taxonomies';
import { formatDateISO } from '@/lib/formatters';

interface IncomeModalProps {
  books: AccountBook[];
  activeBookId: number;
  accounts: Account[];
  initialType?: string;
  editTransaction?: Transaction | null;
  incomeTypes?: IncomeStreamDefinition[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function IncomeModal({
  books,
  activeBookId,
  accounts,
  initialType = 'salary',
  editTransaction = null,
  incomeTypes,
  onClose,
  onSuccess,
}: IncomeModalProps) {
  const [fetchedStreams, setFetchedStreams] = useState<IncomeStreamDefinition[]>([]);

  useEffect(() => {
    if (incomeTypes && incomeTypes.length > 0) return;
    let ignore = false;
    async function loadStreams() {
      try {
        const res = await fetch('/api/income-types');
        const data = await res.json();
        if (!ignore && data.success && Array.isArray(data.incomeTypes) && data.incomeTypes.length > 0) {
          setFetchedStreams(data.incomeTypes);
        }
      } catch (err) {
        console.error('Failed to load income types in modal:', err);
      }
    }
    loadStreams();
    return () => {
      ignore = true;
    };
  }, [incomeTypes]);

  const streamDefs = (incomeTypes && incomeTypes.length > 0)
    ? incomeTypes
    : (fetchedStreams.length > 0 ? fetchedStreams : INCOME_STREAM_DEFINITIONS);

  const [selectedBookId, setSelectedBookId] = useState<number>(() => editTransaction?.book_id || activeBookId);
  const [incomeType, setIncomeType] = useState<string>(() => editTransaction?.income_type || initialType);
  const [date, setDate] = useState<string>(() => {
    if (editTransaction?.date) return editTransaction.date;
    const now = new Date();
    return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [amount, setAmount] = useState<string>(() => (editTransaction ? String(editTransaction.amount) : ''));
  const [description, setDescription] = useState<string>(() => editTransaction?.description || '');
  const [merchant, setMerchant] = useState<string>(() => editTransaction?.merchant || '');
  const [notes, setNotes] = useState<string>(() => editTransaction?.notes || '');
  const [repaymentDueDate, setRepaymentDueDate] = useState<string>(() => editTransaction?.repayment_due_date || '');
  const [repaymentStatus, setRepaymentStatus] = useState<string>(() => editTransaction?.repayment_status || 'pending');

  // Category selection (preset or custom)
  const currentDef = streamDefs.find((d) => d.type === incomeType) || getIncomeStreamDef(incomeType);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (editTransaction?.income_category) return editTransaction.income_category;
    return (currentDef.defaultCategories && currentDef.defaultCategories[0]) || 'General';
  });
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryText, setCustomCategoryText] = useState<string>('');

  // Recurring options
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFreq, setRecurringFreq] = useState<string>('monthly');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Accounts for selected book
  const bookAccounts = accounts.filter((a) => a.book_id === selectedBookId && a.is_active);
  const [accountId, setAccountId] = useState<number>(() => {
    if (editTransaction?.account_id) return editTransaction.account_id;
    // Prefer Bank accounts or Cash
    const preferred = bookAccounts.find((a) => a.type === 'bank') || bookAccounts[0] || accounts[0];
    return preferred?.id || 1;
  });

  const activeBook = books.find((b) => b.id === selectedBookId) || books[0];

  const handleTypeSelect = (typeKey: string) => {
    setIncomeType(typeKey);
    const def = streamDefs.find((d) => d.type === typeKey) || getIncomeStreamDef(typeKey);
    setSelectedCategory((def.defaultCategories && def.defaultCategories[0]) || 'General');
    setIsCustomCategory(false);
    setCustomCategoryText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid income amount greater than 0.');
      return;
    }
    if (!accountId) {
      setErrorMessage('Please select a receiving account.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const finalCategory = isCustomCategory && customCategoryText.trim() ? customCategoryText.trim() : selectedCategory;

    const payload = {
      book_id: selectedBookId,
      date,
      amount: parseFloat(amount),
      account_id: accountId,
      income_type: incomeType,
      income_category: finalCategory,
      merchant: merchant.trim() || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      repayment_due_date: incomeType === 'petty_hand_loan' && repaymentDueDate ? repaymentDueDate : undefined,
      repayment_status: incomeType === 'petty_hand_loan' ? repaymentStatus : undefined,
      is_recurring: isRecurring,
      recurring_frequency: recurringFreq,
    };

    try {
      if (editTransaction) {
        // Update existing
        const res = await fetch('/api/income', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editTransaction.id, ...payload }),
        });
        const data = await res.json();
        if (data.success) {
          onSuccess();
        } else {
          setErrorMessage(data.error || 'Failed to update income entry.');
        }
      } else {
        // Create new
        const res = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          onSuccess();
        } else {
          setErrorMessage(data.error || 'Failed to log income entry.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.9), 0 0 32px rgba(16, 185, 129, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              }}
            >
              {currentDef.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editTransaction ? 'Edit Income Entry' : 'Log Income & Inflow'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {currentDef.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Income Stream Type Selector Grid */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                marginBottom: '8px',
              }}
            >
              Select Income Type / Stream
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px',
              }}
            >
              {streamDefs
                .filter((def) => def.is_active !== 0 || def.type === incomeType)
                .map((def) => {
                  const isSelected = incomeType === def.type;
                  return (
                    <button
                      key={def.type}
                      type="button"
                      onClick={() => handleTypeSelect(def.type)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected
                          ? `linear-gradient(135deg, ${def.color}25, ${def.color}10)`
                          : 'var(--bg-surface-elevated)',
                        border: isSelected ? `2px solid ${def.color}` : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{def.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500 }}>
                        {def.shortLabel}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Amount & Book Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12px' }}>
                  Income Amount *
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--cash-green)',
                    }}
                  >
                    {activeBook?.currency_symbol || activeBook?.currency_code || '₹'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      fontSize: '20px',
                      fontWeight: 800,
                      color: 'var(--cash-green)',
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Account Book / Ledger
                </label>
                <select
                  className="form-select"
                  value={selectedBookId}
                  onChange={(e) => {
                    const newBookId = parseInt(e.target.value, 10);
                    setSelectedBookId(newBookId);
                    const matching = accounts.filter((a) => a.book_id === newBookId && a.is_active);
                    if (matching.length > 0) setAccountId(matching[0].id);
                  }}
                  style={{ width: '100%' }}
                >
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.currency_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receiving Account & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Receiving Account (Deposited Into) *
                </label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                  required
                >
                  {bookAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type === 'cash' ? 'Cash' : a.type === 'bank' ? 'Bank' : 'Card'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Date Received *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Specific Category / Preset Subtype */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '12px' }}>
                  {currentDef.shortLabel} Category / Stream
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isCustomCategory ? 'Pick preset category' : '+ Enter custom category'}
                </button>
              </div>

              {!isCustomCategory ? (
                <select
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {currentDef.defaultCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Organic Black Pepper Harvest, Mango Orchard Lease"
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                  autoFocus
                />
              )}
            </div>

            {/* Contextual Payer / Friend / Source & Description */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  {currentDef.payerLabel}
                </label>
                <input
                  type="text"
                  placeholder={currentDef.payerPlaceholder}
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Description / Reference
                </label>
                <input
                  type="text"
                  placeholder={currentDef.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* SPECIAL SECTION FOR PETTY HAND LOANS FROM FRIENDS */}
            {incomeType === 'petty_hand_loan' && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>
                    Petty Hand Loan Tracking
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Expected Repayment Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={repaymentDueDate}
                      onChange={(e) => setRepaymentDueDate(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>
                      Loan Status
                    </label>
                    <select
                      className="form-select"
                      value={repaymentStatus}
                      onChange={(e) => setRepaymentStatus(e.target.value)}
                      style={{ width: '100%', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                    >
                      <option value="pending">⏳ Pending Repayment (Active Loan)</option>
                      <option value="repaid">✅ Repaid / Settled</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="form-label" style={{ fontSize: '12px' }}>
                Additional Notes / Terms (Optional)
              </label>
              <textarea
                rows={2}
                placeholder={
                  incomeType === 'petty_hand_loan'
                    ? 'e.g. Promised to return before 15th next month. Interest-free friendly loan.'
                    : incomeType === 'farm'
                    ? 'e.g. Sold to local cooperative at ₹35/kg. Plot B yield.'
                    : incomeType === 'stock_capital'
                    ? 'e.g. Buy price ₹2,100, sold at ₹2,650 on Zerodha Kite.'
                    : 'Any supplementary notes or terms...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                style={{ width: '100%', resize: 'none' }}
              />
            </div>

            {/* Recurring Schedule Checkbox (only for new entries) */}
            {!editTransaction && (
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <Repeat size={15} color="var(--primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Schedule as a Recurring Income Stream
                  </span>
                </label>
                {isRecurring && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Repeats:</span>
                    <select
                      className="form-select"
                      value={recurringFreq}
                      onChange={(e) => setRecurringFreq(e.target.value)}
                      style={{ width: '160px', padding: '6px 10px', fontSize: '12px' }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '10px',
              }}
            >
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderColor: '#10b981',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                }}
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{editTransaction ? 'Save Changes' : 'Record Income'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
