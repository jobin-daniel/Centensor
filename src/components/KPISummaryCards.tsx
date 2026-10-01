'use client';

import React from 'react';
import { DollarSign, Wallet, CreditCard, ArrowDownRight, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { MonthlyWorksheetData } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface KPISummaryCardsProps {
  data: MonthlyWorksheetData;
}

export default function KPISummaryCards({ data }: KPISummaryCardsProps) {
  const { monthTotals, book, daysInMonth } = data;
  const currencyCode = book.currency_code;
  const symbol = book.currency_symbol;

  const totalSpent = monthTotals.totalExpenses;
  const totalBudget = monthTotals.totalBudget;
  const variance = totalBudget > 0 ? totalBudget - totalSpent : 0;
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;
  const budgetPercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  // Daily average
  const dailyAverage = daysInMonth > 0 ? totalSpent / daysInMonth : 0;

  return (
    <div className="kpi-grid">
      {/* 1. Total Expenses & Budget */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Total Month Expenses</span>
          <div className="kpi-icon-wrap" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            <DollarSign size={18} />
          </div>
        </div>
        <div className="kpi-value">{formatCurrency(totalSpent, currencyCode, symbol)}</div>
        <div className="kpi-subtitle">
          {totalBudget > 0 ? (
            isOverBudget ? (
              <span style={{ color: 'var(--danger-rose)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={13} />
                Exceeded budget by {formatCurrency(Math.abs(variance), currencyCode, symbol)}
              </span>
            ) : (
              <span style={{ color: 'var(--cash-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={13} />
                Within budget ({formatCurrency(variance, currencyCode, symbol)} left)
              </span>
            )
          ) : (
            <span>Daily Average: {formatCurrency(dailyAverage, currencyCode, symbol)} / day</span>
          )}
        </div>
        {totalBudget > 0 && (
          <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
            <div
              style={{
                width: `${budgetPercent}%`,
                height: '100%',
                background: isOverBudget ? 'var(--danger-rose)' : 'var(--cash-green)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        )}
      </div>

      {/* 2. Cash Spent Breakdown */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Cash in Hand Spent</span>
          <div className="kpi-icon-wrap" style={{ background: 'var(--cash-green-subtle)', color: 'var(--cash-green)' }}>
            <Wallet size={18} />
          </div>
        </div>
        <div className="kpi-value">{formatCurrency(monthTotals.totalCashSpent, currencyCode, symbol)}</div>
        <div className="kpi-subtitle">
          <span>{totalSpent > 0 ? `${Math.round((monthTotals.totalCashSpent / totalSpent) * 100)}% of total expenses` : '0%'}</span>
        </div>
      </div>

      {/* 3. Cards Spent Breakdown (Debit + Credit) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Cards & Digital Spent</span>
          <div className="kpi-icon-wrap" style={{ background: 'var(--credit-violet-subtle)', color: 'var(--credit-violet)' }}>
            <CreditCard size={18} />
          </div>
        </div>
        <div className="kpi-value">{formatCurrency(monthTotals.totalCardSpent, currencyCode, symbol)}</div>
        <div className="kpi-subtitle">
          <span>{totalSpent > 0 ? `${Math.round((monthTotals.totalCardSpent / totalSpent) * 100)}% of total expenses` : '0%'}</span>
        </div>
      </div>

      {/* 4. Cash In Hand (EOD Reconciled) */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">End-of-Month Cash in Hand</span>
          <div className="kpi-icon-wrap" style={{ background: 'var(--warning-amber-subtle)', color: 'var(--warning-amber)' }}>
            <ArrowDownRight size={18} />
          </div>
        </div>
        <div className="kpi-value">{formatCurrency(monthTotals.endingCash, currencyCode, symbol)}</div>
        <div className="kpi-subtitle">
          <span>Starting: {formatCurrency(monthTotals.startingCash, currencyCode, symbol)} | Withdrawals: +{formatCurrency(monthTotals.totalWithdrawals, currencyCode, symbol)}</span>
        </div>
      </div>
    </div>
  );
}
