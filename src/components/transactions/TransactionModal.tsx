'use client';

import React, { useState } from 'react';
import { X, Wallet, Banknote, CreditCard, ArrowRightLeft, DollarSign } from 'lucide-react';
import { AccountBook, Account, Category, PaymentMethod, TransactionType } from '@/lib/types';
import { formatDateISO } from '@/lib/formatters';

interface TransactionModalProps {
  books: AccountBook[];
  activeBookId: number;
  accounts: Account[];
  categories: Category[];
  initialDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({
  books,
  activeBookId,
  accounts,
  categories,
  initialDate,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const [selectedBookId, setSelectedBookId] = useState<number>(activeBookId);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState<string>(() => {
    if (initialDate) return initialDate;
    const now = new Date();
    return formatDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
  });
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [categoryId, setCategoryId] = useState<number>(() => categories[0]?.id || 1);
  const [description, setDescription] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter accounts for selected book
  const bookAccounts = accounts.filter((a) => a.book_id === selectedBookId);

  // Accounts for source
  const sourceAccounts = bookAccounts.filter((a) => {
    if (type === 'bank_withdrawal' || type === 'card_settlement') {
      return a.type === 'bank';
    }
    if (paymentMethod === 'cash') return a.type === 'cash';
    if (paymentMethod === 'debit_card') return a.type === 'bank' || a.type === 'debit_card';
    if (paymentMethod === 'credit_card') return a.type === 'credit_card';
    return true;
  });

  const [accountId, setAccountId] = useState<number>(() => sourceAccounts[0]?.id || 1);

  // Target account for withdrawal or card settlement
  const cashAccounts = bookAccounts.filter((a) => a.type === 'cash');
  const creditCardAccounts = bookAccounts.filter((a) => a.type === 'credit_card');
  const [toAccountId, setToAccountId] = useState<number>(() => {
    if (type === 'bank_withdrawal') return cashAccounts[0]?.id || 0;
    if (type === 'card_settlement') return creditCardAccounts[0]?.id || 0;
    return 0;
  });

  const activeBook = books.find((b) => b.id === selectedBookId) || books[0];

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
      const bank = bookAccounts.find((a) => a.type === 'bank');
      if (bank) setAccountId(bank.id);
      const cash = bookAccounts.find((a) => a.type === 'cash');
      if (cash) setToAccountId(cash.id);
      setPaymentMethod('cash');
    } else if (newType === 'card_settlement') {
      const bank = bookAccounts.find((a) => a.type === 'bank');
      if (bank) setAccountId(bank.id);
      const card = bookAccounts.find((a) => a.type === 'credit_card');
      if (card) setToAccountId(card.id);
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
      };

      if (type === 'expense') {
        payload.category_id = categoryId;
      } else if (type === 'bank_withdrawal' || type === 'card_settlement') {
        payload.to_account_id = toAccountId;
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || 'Failed to save transaction');
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
          <h2 className="modal-title">Record Transaction</h2>
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
              onChange={(e) => setSelectedBookId(parseInt(e.target.value, 10))}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency_code})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 4px' }}
              onClick={() => handleTypeChange('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`btn ${type === 'bank_withdrawal' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 4px' }}
              onClick={() => handleTypeChange('bank_withdrawal')}
            >
              Bank Cash In
            </button>
            <button
              type="button"
              className={`btn ${type === 'card_settlement' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 4px' }}
              onClick={() => handleTypeChange('card_settlement')}
            >
              Card Bill Pay
            </button>
            <button
              type="button"
              className={`btn ${type === 'income' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '8px 4px' }}
              onClick={() => handleTypeChange('income')}
            >
              Income
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
                Amount ({activeBook?.currency_symbol || activeBook?.currency_code})
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
              {type === 'bank_withdrawal' || type === 'card_settlement' ? 'From Bank Account' : 'Account'}
            </label>
            <select
              className="form-select"
              value={accountId}
              onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
            >
              {sourceAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          {/* Target Account for Withdrawal or Card Settlement */}
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

          {/* General Ledger Category (For Expense) */}
          {type === 'expense' && (
            <div className="form-group">
              <label className="form-label">General Ledger Category (Main Head &gt; Sub Head)</label>
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

          {/* Description & Merchant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Description / Item</label>
              <input
                type="text"
                placeholder="e.g. Groceries, Fuel"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Merchant / Payee</label>
              <input
                type="text"
                placeholder="e.g. Carrefour, Shell"
                className="form-input"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
          >
            {isSubmitting ? 'Saving Transaction...' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
