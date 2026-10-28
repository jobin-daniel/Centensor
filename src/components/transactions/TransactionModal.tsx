'use client';

import React, { useState } from 'react';
import { X, Wallet, Banknote, CreditCard, ArrowRightLeft, DollarSign, Repeat, ArrowRight } from 'lucide-react';
import { AccountBook, Account, Category, PaymentMethod, TransactionType, RecurringFrequency, Transaction } from '@/lib/types';
import { formatDateISO, formatCurrency } from '@/lib/formatters';
import { INCOME_STREAM_DEFINITIONS, getIncomeStreamDef } from '@/lib/income-taxonomies';

interface TransactionModalProps {
  books: AccountBook[];
  activeBookId: number;
  accounts: Account[];
  categories: Category[];
  initialDate?: string;
  editTransaction?: Transaction | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({
  books,
  activeBookId,
  accounts,
  categories,
  initialDate,
  editTransaction,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const isEditing = Boolean(editTransaction);
  const [selectedBookId, setSelectedBookId] = useState<number>(() => editTransaction?.book_id || activeBookId);
  const [type, setType] = useState<TransactionType>(() => editTransaction?.type || 'expense');
  const [date, setDate] = useState<string>(() => {
    if (editTransaction?.date) return editTransaction.date;
    if (initialDate) return initialDate;
    const now = new Date();
    return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [amount, setAmount] = useState<string>(() => (editTransaction ? String(editTransaction.amount) : ''));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => editTransaction?.payment_method || 'cash');
  const [categoryId, setCategoryId] = useState<number>(() => editTransaction?.category_id || categories[0]?.id || 1);
  const [description, setDescription] = useState<string>(() => editTransaction?.description || '');
  const [merchant, setMerchant] = useState<string>(() => editTransaction?.merchant || '');
  const [notes, setNotes] = useState<string>(() => editTransaction?.notes || '');
  const [incomeType, setIncomeType] = useState<string>(() => editTransaction?.income_type || 'salary');
  const [incomeCategory, setIncomeCategory] = useState<string>(() => editTransaction?.income_category || 'Monthly Base Salary');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Recurring income options
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>('monthly');
  const [recurringDay, setRecurringDay] = useState<number>(() => {
    const d = new Date().getDate();
    return Math.min(d, 28);
  });

  // Filter accounts for selected book
  const bookAccounts = accounts.filter((a) => a.book_id === selectedBookId);

  // Accounts for source
  const sourceAccounts = accounts.filter((a) => {
    if (type === 'transfer') {
      return a.book_id === selectedBookId || accounts.some((acc) => acc.id === a.id);
    }
    if (type === 'bank_withdrawal' || type === 'card_settlement') {
      return a.book_id === selectedBookId && a.type === 'bank';
    }
    if (type === 'income') {
      return a.book_id === selectedBookId;
    }
    if (paymentMethod === 'cash') return a.book_id === selectedBookId && a.type === 'cash';
    if (paymentMethod === 'debit_card') return a.book_id === selectedBookId && (a.type === 'bank' || a.type === 'debit_card');
    if (paymentMethod === 'credit_card') return a.book_id === selectedBookId && a.type === 'credit_card';
    return a.book_id === selectedBookId;
  });

  const [accountId, setAccountId] = useState<number>(
    () => editTransaction?.account_id || sourceAccounts[0]?.id || accounts[0]?.id || 1
  );

  // Target account for withdrawal, card settlement, or generic transfer
  const cashAccounts = bookAccounts.filter((a) => a.type === 'cash');
  const creditCardAccounts = bookAccounts.filter((a) => a.type === 'credit_card');
  const transferDestinationAccounts = accounts.filter((a) => a.id !== accountId);

  const [toAccountId, setToAccountId] = useState<number>(() => {
    if (editTransaction?.to_account_id) return editTransaction.to_account_id;
    if (type === 'bank_withdrawal') return cashAccounts[0]?.id || 0;
    if (type === 'card_settlement') return creditCardAccounts[0]?.id || 0;
    if (type === 'transfer') return transferDestinationAccounts[0]?.id || 0;
    return 0;
  });

  const activeBook = books.find((b) => b.id === selectedBookId) || books[0];
  const sourceAccountObj = accounts.find((a) => a.id === accountId);
  const toAccountObj = accounts.find((a) => a.id === toAccountId);

  const handlePaymentMethodChange = (pm: PaymentMethod) => {
    setPaymentMethod(pm);
    const matching = bookAccounts.find((a) => {
      if (pm === 'cash') return a.type === 'cash';
      if (pm === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
      if (pm === 'credit_card') return a.type === 'credit_card';
      return false;
    });
    if (matching) setAccountId(matching.id);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'bank_withdrawal') {
      const bank = bookAccounts.find((a) => a.type === 'bank') || accounts.find((a) => a.type === 'bank');
      if (bank) setAccountId(bank.id);
      const cash = bookAccounts.find((a) => a.type === 'cash') || accounts.find((a) => a.type === 'cash');
      if (cash) setToAccountId(cash.id);
      setPaymentMethod('cash');
    } else if (newType === 'card_settlement') {
      const bank = bookAccounts.find((a) => a.type === 'bank') || accounts.find((a) => a.type === 'bank');
      if (bank) setAccountId(bank.id);
      const card = bookAccounts.find((a) => a.type === 'credit_card') || accounts.find((a) => a.type === 'credit_card');
      if (card) setToAccountId(card.id);
      setPaymentMethod('debit_card');
    } else if (newType === 'transfer') {
      const src = bookAccounts[0] || accounts[0];
      if (src) setAccountId(src.id);
      const dest = accounts.find((a) => a.id !== (src?.id || 0)) || accounts[1];
      if (dest) setToAccountId(dest.id);
      setPaymentMethod('debit_card');
    } else if (newType === 'income') {
      const bank = bookAccounts.find((a) => a.type === 'bank') || bookAccounts[0] || accounts[0];
      if (bank) setAccountId(bank.id);
      setPaymentMethod('debit_card');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        book_id: selectedBookId,
        date,
        amount: parseFloat(amount),
        account_id: accountId,
        payment_method: paymentMethod,
        type,
        description: description || undefined,
        merchant: merchant || undefined,
        notes: notes || undefined,
      };

      if (type === 'expense') {
        payload.category_id = categoryId;
      } else if (type === 'income') {
        payload.category_id = categoryId || undefined;
        payload.income_type = incomeType;
        payload.income_category = incomeCategory;
        if (incomeType === 'petty_hand_loan') {
          payload.repayment_status = editTransaction?.repayment_status || 'pending';
        }
      } else if (type === 'bank_withdrawal' || type === 'card_settlement' || type === 'transfer') {
        payload.to_account_id = toAccountId;
      }

      if (editTransaction) {
        payload.id = editTransaction.id;
        const res = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          onSuccess();
        } else {
          alert(data.error || 'Failed to update transaction');
        }
      } else {
        // Save new transaction
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          // If recurring income checked, also create recurring schedule
          if (type === 'income' && isRecurring) {
            try {
              await fetch('/api/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  book_id: selectedBookId,
                  account_id: accountId,
                  category_id: categoryId || null,
                  type: 'income',
                  name: description || merchant || 'Recurring Income',
                  amount: parseFloat(amount),
                  currency_code: sourceAccountObj?.currency_code || activeBook?.currency_code || 'INR',
                  frequency: recurringFreq,
                  day_of_month: recurringDay,
                  start_date: date,
                  payer_merchant: merchant || null,
                  description: description || null,
                  auto_post: 1,
                }),
              });
            } catch (recErr) {
              console.error('Error saving recurring schedule:', recErr);
            }
          }

          onSuccess();
        } else {
          alert(data.error || 'Failed to save transaction');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Network error saving transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editTransaction
              ? type === 'expense'
                ? 'Edit Expense'
                : `Edit ${type === 'bank_withdrawal' ? 'Bank Cash In' : type === 'card_settlement' ? 'Card Bill Pay' : type === 'transfer' ? 'Transfer' : 'Income'}`
              : 'Record Transaction'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Account Book Context */}
          <div className="form-group">
            <label className="form-label">Account Book / Country</label>
            <select
              className="form-select"
              value={selectedBookId}
              onChange={(e) => {
                const bId = parseInt(e.target.value, 10);
                setSelectedBookId(bId);
                const firstAcc = accounts.find((a) => a.book_id === bId);
                if (firstAcc) setAccountId(firstAcc.id);
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency_code})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            <button
              type="button"
              className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 2px' }}
              onClick={() => handleTypeChange('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 2px' }}
              onClick={() => handleTypeChange('income')}
            >
              <DollarSign size={12} />
              <span>Income</span>
            </button>
            <button
              type="button"
              className={`btn ${type === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 2px' }}
              onClick={() => handleTypeChange('transfer')}
            >
              <ArrowRightLeft size={12} />
              <span>Transfer</span>
            </button>
            <button
              type="button"
              className={`btn ${type === 'bank_withdrawal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 2px' }}
              onClick={() => handleTypeChange('bank_withdrawal')}
            >
              Bank Cash In
            </button>
            <button
              type="button"
              className={`btn ${type === 'card_settlement' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 2px' }}
              onClick={() => handleTypeChange('card_settlement')}
            >
              Card Bill Pay
            </button>
          </div>

          {/* Date & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Amount ({sourceAccountObj?.currency_symbol || activeBook?.currency_symbol || activeBook?.currency_code})
              </label>
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
          </div>

          {/* Payment Method Toggle (Only for Expense) */}
          {type === 'expense' && (
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div className="payment-toggle-group">
                <button
                  type="button"
                  className={`payment-toggle-btn ${paymentMethod === 'cash' ? 'active cash' : ''}`}
                  onClick={() => handlePaymentMethodChange('cash')}
                >
                  <Wallet size={14} />
                  <span>Cash in Hand</span>
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
          )}

          {/* Source Account */}
          <div className="form-group">
            <label className="form-label">
              {type === 'bank_withdrawal' || type === 'card_settlement'
                ? 'From Bank Account'
                : type === 'transfer'
                ? 'From Source Account'
                : type === 'income'
                ? 'Credit To Account'
                : 'Account'}
            </label>
            <select
              className="form-select"
              value={accountId}
              onChange={(e) => {
                const accId = parseInt(e.target.value, 10);
                setAccountId(accId);
                if (type === 'transfer' && toAccountId === accId) {
                  const alt = accounts.find((a) => a.id !== accId);
                  if (alt) setToAccountId(alt.id);
                }
              }}
            >
              {sourceAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.book_name || a.type}) • Balance: {formatCurrency(a.current_balance, a.currency_code, a.currency_symbol)}
                </option>
              ))}
            </select>
          </div>

          {/* Target Account for Generic Transfer */}
          {type === 'transfer' && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowRight size={14} color="var(--primary)" />
                <span>To Destination Account</span>
              </label>
              <select
                className="form-select"
                value={toAccountId}
                onChange={(e) => setToAccountId(parseInt(e.target.value, 10))}
              >
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.book_name || a.type}) • Balance: {formatCurrency(a.current_balance, a.currency_code, a.currency_symbol)}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Target Account for Withdrawal */}
          {type === 'bank_withdrawal' && (
            <div className="form-group">
              <label className="form-label">To Cash Account</label>
              <select
                className="form-select"
                value={toAccountId}
                onChange={(e) => setToAccountId(parseInt(e.target.value, 10))}
              >
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Account for Card Settlement */}
          {type === 'card_settlement' && (
            <div className="form-group">
              <label className="form-label">To Credit Card Account</label>
              <select
                className="form-select"
                value={toAccountId}
                onChange={(e) => setToAccountId(parseInt(e.target.value, 10))}
              >
                {creditCardAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* General Ledger Category for Expense */}
          {type === 'expense' && (
            <div className="form-group">
              <label className="form-label">
                General Ledger Category (Main Head &gt; Sub Head)
              </label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
              >
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
            </div>
          )}

          {/* Income Stream & Category for Income */}
          {type === 'income' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Income Stream / Type</label>
                <select
                  className="form-select"
                  value={incomeType}
                  onChange={(e) => {
                    const newT = e.target.value;
                    setIncomeType(newT);
                    const def = getIncomeStreamDef(newT);
                    setIncomeCategory(def.defaultCategories[0] || 'General');
                  }}
                >
                  {INCOME_STREAM_DEFINITIONS.map((def) => (
                    <option key={def.type} value={def.type}>
                      {def.icon} {def.shortLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Income Category / Subtype</label>
                <select
                  className="form-select"
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                >
                  {getIncomeStreamDef(incomeType).defaultCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Description & Merchant / Payee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                {type === 'transfer' ? 'Transfer Reference / Note' : 'Description / Item'}
              </label>
              <input
                type="text"
                placeholder={type === 'income' ? 'e.g. Monthly Salary, Freelance Payment' : type === 'transfer' ? 'e.g. Fund transfer to savings' : 'e.g. Groceries, Fuel'}
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {type === 'income' ? 'Payer / Client / Source' : type === 'transfer' ? 'Recipient / Note' : 'Merchant / Payee'}
              </label>
              <input
                type="text"
                placeholder={type === 'income' ? 'e.g. Employer Inc, Client LLC' : type === 'transfer' ? 'e.g. Wire Transfer, Internal' : 'e.g. Carrefour, Shell'}
                className="form-input"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input
              type="text"
              placeholder="Additional remarks or tags..."
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Recurring Income Checkbox Option */}
          {type === 'income' && (
            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginTop: '4px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Repeat size={14} color="var(--primary)" />
                  <span>Save as Recurring Income Schedule</span>
                </span>
              </label>

              {isRecurring && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Frequency</label>
                    <select
                      className="form-select"
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      value={recurringFreq}
                      onChange={(e) => setRecurringFreq(e.target.value as RecurringFrequency)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {recurringFreq === 'monthly' && (
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Day of Month</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        className="form-input"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                        value={recurringDay}
                        onChange={(e) => setRecurringDay(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          >
            {isSubmitting
              ? 'Saving...'
              : editTransaction
              ? type === 'expense'
                ? 'Update Expense'
                : 'Save Changes'
              : type === 'transfer'
              ? 'Complete Account Transfer'
              : type === 'income'
              ? 'Save Income'
              : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
