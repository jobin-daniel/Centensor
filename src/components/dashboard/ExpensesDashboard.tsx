'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar,
  Layers,
  Receipt,
  Download,
  Plus,
  RefreshCw,
  Building2,
  PieChart,
  Search,
  Sparkles,
  X,
  Filter,
} from 'lucide-react';
import { ExpenseDashboardData, AccountBook } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import MonthlyTrendChart from './MonthlyTrendChart';
import CategoryDonutChart from './CategoryDonutChart';
import DailySpendingChart from './DailySpendingChart';
import WeekdaySpendingChart from './WeekdaySpendingChart';

interface ExpensesDashboardProps {
  books: AccountBook[];
  activeBookId: number;
  year: number;
  month: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (year: number, month: number) => void;
  onBookChange?: (bookId: number) => void;
  onOpenNewTxModal?: () => void;
}

export default function ExpensesDashboard({
  books,
  activeBookId,
  year,
  month,
  onYearChange,
  onMonthChange,
  onBookChange,
  onOpenNewTxModal,
}: ExpensesDashboardProps) {
  const [data, setData] = useState<ExpenseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter controls
  const [scope, setScope] = useState<'book' | 'all'>('book');
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');
  const [categorySearch, setCategorySearch] = useState('');
  const [categorySortBy, setCategorySortBy] = useState<'amount' | 'name' | 'count'>('amount');
  const [selectedHeadId, setSelectedHeadId] = useState<number | null>(null);

  // Manual refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const bookParam = scope === 'all' ? 'all' : activeBookId;
      const res = await fetch(
        `/api/dashboard?bookId=${bookParam}&year=${year}&month=${month}&period=${period}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Error refreshing dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      try {
        const bookParam = scope === 'all' ? 'all' : activeBookId;
        const res = await fetch(
          `/api/dashboard?bookId=${bookParam}&year=${year}&month=${month}&period=${period}`
        );
        const json = await res.json();
        if (!isCancelled && json.success) {
          setData(json.data);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading dashboard data:', e);
        if (!isCancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [activeBookId, year, month, scope, period]);

  // Export Summary CSV
  const handleExportSummaryCSV = () => {
    if (!data) return;
    const headers = ['Category', 'Group', 'Amount', 'Currency', 'Percentage', 'Transactions', 'Average'];
    const rows = data.categoryBreakdown.map((c) => [
      `"${c.categoryName}"`,
      `"${c.groupName}"`,
      c.totalAmount,
      data.summary.currency.code,
      `${c.percentOfTotal.toFixed(2)}%`,
      c.count,
      c.avgAmount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Centensor_Expense_Summary_${data.bookName.replace(/\s+/g, '_')}_${year}_${month}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={24} style={{ margin: '0 auto 12px' }} />
        <div>Loading Expenses Analytics Dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No dashboard data available.
      </div>
    );
  }

  const { summary, categoryBreakdown, headBreakdown, groupBreakdown, monthlyTrend, dailyTrend, weekdayBreakdown, paymentMethodBreakdown, accountBreakdown, topTransactions } = data;
  const currCode = summary.currency.code;
  const currSymbol = summary.currency.symbol;

  const selectedHead = headBreakdown?.find((h) => h.headId === selectedHeadId) || null;

  // Filtered & sorted categories
  const filteredCategories = categoryBreakdown
    .filter((c) => {
      if (selectedHeadId !== null && c.headId !== selectedHeadId) return false;
      if (categorySearch) {
        return (
          c.categoryName.toLowerCase().includes(categorySearch.toLowerCase()) ||
          c.groupName.toLowerCase().includes(categorySearch.toLowerCase())
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (categorySortBy === 'amount') return b.totalAmount - a.totalAmount;
      if (categorySortBy === 'count') return b.count - a.count;
      return a.categoryName.localeCompare(b.categoryName);
    });

  const matchingTransactions = selectedHeadId !== null
    ? topTransactions.filter((tx) => {
        const cat = categoryBreakdown.find((c) => c.categoryId === tx.category_id);
        return cat?.headId === selectedHeadId;
      })
    : topTransactions;

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  return (
    <div className="container dashboard-container">
      {/* 1. Header Toolbar */}
      <div className="dashboard-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
                borderRadius: 'var(--radius-md)',
                color: 'var(--primary)',
                boxShadow: '0 0 16px rgba(139, 92, 246, 0.3)',
              }}
            >
              <PieChart size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Expenses Analytics Dashboard
                </h1>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#ffffff',
                    textTransform: 'uppercase',
                  }}
                >
                  SUPER-APP
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Financial intelligence, spending velocity, and category analytics for{' '}
                <strong>{data.bookName}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Scope Selector: Active Book vs All Books */}
          <div className="dashboard-pill-group">
            <button
              className={`dashboard-pill-btn ${scope === 'book' ? 'active' : ''}`}
              onClick={() => setScope('book')}
            >
              Single Book
            </button>
            <button
              className={`dashboard-pill-btn ${scope === 'all' ? 'active' : ''}`}
              onClick={() => setScope('all')}
            >
              Consolidated (All)
            </button>
          </div>

          {/* Period Toggle */}
          <div className="dashboard-pill-group">
            <button
              className={`dashboard-pill-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Month
            </button>
            <button
              className={`dashboard-pill-btn ${period === 'year' ? 'active' : ''}`}
              onClick={() => setPeriod('year')}
            >
              Full Year
            </button>
            <button
              className={`dashboard-pill-btn ${period === 'all' ? 'active' : ''}`}
              onClick={() => setPeriod('all')}
            >
              All Time
            </button>
          </div>

          {/* Book Dropdown (when scope is 'book') */}
          {scope === 'book' && (
            <select
              className="form-select"
              value={activeBookId}
              onChange={(e) => onBookChange && onBookChange(Number(e.target.value))}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency_code})
                </option>
              ))}
            </select>
          )}

          {/* Year Dropdown */}
          <select
            className="form-select"
            value={year}
            onChange={(e) => onYearChange && onYearChange(Number(e.target.value))}
          >
            {data.availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month Dropdown (when period is 'month') */}
          {period === 'month' && (
            <select
              className="form-select"
              value={month}
              onChange={(e) => onMonthChange && onMonthChange(year, Number(e.target.value))}
            >
              {[
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ].map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          )}

          {/* Action Buttons */}
          <button
            className="btn btn-secondary"
            onClick={handleExportSummaryCSV}
            title="Export CSV Summary"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            title="Refresh Dashboard"
          >
            <RefreshCw size={14} />
          </button>

          {onOpenNewTxModal && (
            <button className="btn btn-primary" onClick={onOpenNewTxModal}>
              <Plus size={14} />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Tata Neu Super-App Category Quick-Rail */}
      {headBreakdown && headBreakdown.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Explore Categories & Main Heads
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({headBreakdown.length} Configurable Heads)
              </span>
            </div>

            {selectedHead && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Filtering: {selectedHead.headIcon} {selectedHead.headName}</span>
                  <button
                    onClick={() => setSelectedHeadId(null)}
                    style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
                    title="Clear category filter"
                  >
                    <X size={12} />
                  </button>
                </span>
                <button
                  onClick={() => setSelectedHeadId(null)}
                  style={{ fontSize: '11px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          <div className="neu-category-rail">
            {/* "All Heads" tile */}
            <button
              className={`neu-category-tile ${selectedHeadId === null ? 'active' : ''}`}
              onClick={() => setSelectedHeadId(null)}
              title="Show all category heads"
            >
              <div
                className="neu-cat-icon-squircle"
                style={{
                  background: selectedHeadId === null
                    ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  borderColor: selectedHeadId === null ? '#ec4899' : 'rgba(255,255,255,0.1)',
                }}
              >
                <span>✨</span>
              </div>
              <span className="neu-cat-name">All Heads</span>
              <span className="neu-cat-spend-pill">
                {formatCurrency(summary.totalExpenses, currCode, currSymbol)}
              </span>
            </button>

            {/* Individual Category Heads */}
            {headBreakdown.map((head) => {
              const isActive = selectedHeadId === head.headId;
              return (
                <button
                  key={head.headId}
                  className={`neu-category-tile ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedHeadId(isActive ? null : head.headId)}
                  title={`Filter by ${head.headName}`}
                  style={{
                    ['--tile-glow' as any]: head.headColor || 'rgba(139, 92, 246, 0.6)',
                  }}
                >
                  <div
                    className="neu-cat-icon-squircle"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${head.headColor}, #8b5cf6)`
                        : `linear-gradient(135deg, ${head.headColor}26, ${head.headColor}08)`,
                      borderColor: isActive ? '#ffffff' : `${head.headColor}4d`,
                    }}
                  >
                    <span>{head.headIcon || '📁'}</span>
                  </div>
                  <span className="neu-cat-name" title={head.headName}>
                    {head.headName}
                  </span>
                  <span
                    className="neu-cat-spend-pill"
                    style={{
                      color: head.totalAmount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                      background: head.totalAmount > 0 ? `${head.headColor}26` : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {head.totalAmount > 0 ? formatCurrency(head.totalAmount, currCode, currSymbol) : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Tata Neu Pass / Financial Account Status Banner */}
      <div className="neu-pass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(124, 58, 237, 0.5)',
              fontSize: '24px',
            }}
          >
            💳
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Centensor Neu Pass
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(236, 72, 153, 0.2)',
                  color: '#ec4899',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                }}
              >
                {currCode} Active
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginTop: '2px' }}>
              {data.bookName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {data.monthName} {year} · {summary.transactionCount} settled transactions
            </div>
          </div>
        </div>

        {/* Middle: Cash vs Cards Split Bar */}
        <div style={{ minWidth: '240px', flex: 1, maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--cash-green)', fontWeight: 700 }}>
              💵 Cash: {summary.cashRatio.toFixed(0)}%
            </span>
            <span style={{ color: 'var(--credit-violet)', fontWeight: 700 }}>
              💳 Digital: {summary.cardRatio.toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${summary.cashRatio}%`,
                background: 'var(--cash-green)',
                transition: 'width 0.4s ease',
              }}
            />
            <div
              style={{
                width: `${summary.cardRatio}%`,
                background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>{formatCurrency(summary.cashSpent, currCode, currSymbol)}</span>
            <span>{formatCurrency(summary.cardSpent, currCode, currSymbol)}</span>
          </div>
        </div>

        {/* Right Outflow Stats */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Period Outflow
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(summary.totalExpenses, currCode, currSymbol)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Daily Run Rate: <strong>{formatCurrency(summary.avgDailyExpense, currCode, currSymbol)}</strong> / day
          </div>
        </div>
      </div>

      {/* 4. Top KPI Summary Strip */}
      <div className="kpi-grid">
        {/* KPI 1: Total Expenses */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">
              {period === 'month'
                ? `${data.monthName} ${year} Outflow`
                : period === 'year'
                ? `Total ${year} Outflow`
                : 'All-Time Outflow'}
            </span>
            <div
              className="kpi-icon-wrap"
              style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {formatCurrency(summary.totalExpenses, currCode, currSymbol)}
          </div>
          <div className="kpi-subtitle" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{summary.transactionCount} transactions</span>
            {summary.momChangePercent !== null && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  fontWeight: 700,
                  fontSize: '11px',
                  color:
                    summary.momChangePercent > 0
                      ? 'var(--danger-rose)'
                      : summary.momChangePercent < 0
                      ? 'var(--cash-green)'
                      : 'var(--text-muted)',
                }}
              >
                {summary.momChangePercent > 0 ? (
                  <TrendingUp size={13} />
                ) : summary.momChangePercent < 0 ? (
                  <TrendingDown size={13} />
                ) : null}
                {summary.momChangePercent > 0 ? '+' : ''}
                {summary.momChangePercent.toFixed(1)}% vs prev
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Cash vs Digital Ratio */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Payment Channels Split</span>
            <div
              className="kpi-icon-wrap"
              style={{ background: 'var(--card-blue-subtle)', color: 'var(--card-blue)' }}
            >
              <CreditCard size={18} />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '20px',
              fontWeight: 800,
            }}
          >
            <span style={{ color: 'var(--cash-green)' }}>{summary.cashRatio.toFixed(0)}%</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cash</span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ color: 'var(--credit-violet)' }}>{summary.cardRatio.toFixed(0)}%</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cards</span>
          </div>

          {/* Visual 2-color split bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: '999px',
              display: 'flex',
              overflow: 'hidden',
              marginTop: '4px',
            }}
          >
            <div
              style={{
                width: `${summary.cashRatio}%`,
                background: 'var(--cash-green)',
                transition: 'width 0.4s ease',
              }}
              title={`Cash: ${formatCurrency(summary.cashSpent, currCode, currSymbol)} (${summary.cashRatio.toFixed(1)}%)`}
            />
            <div
              style={{
                width: `${summary.cardRatio}%`,
                background: 'var(--credit-violet)',
                transition: 'width 0.4s ease',
              }}
              title={`Cards: ${formatCurrency(summary.cardSpent, currCode, currSymbol)} (${summary.cardRatio.toFixed(1)}%)`}
            />
          </div>

          <div className="kpi-subtitle" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span>Cash: {formatCurrency(summary.cashSpent, currCode, currSymbol)}</span>
            <span>Cards: {formatCurrency(summary.cardSpent, currCode, currSymbol)}</span>
          </div>
        </div>

        {/* KPI 3: Daily Average */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Daily Run Rate</span>
            <div
              className="kpi-icon-wrap"
              style={{ background: 'var(--cash-green-subtle)', color: 'var(--cash-green)' }}
            >
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {formatCurrency(summary.avgDailyExpense, currCode, currSymbol)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}> / day</span>
          </div>
          <div className="kpi-subtitle">
            {summary.highestExpenseDay ? (
              <span>
                Peak Day: {summary.highestExpenseDay.date.slice(-2)}th (
                {formatCurrency(summary.highestExpenseDay.amount, currCode, currSymbol)})
              </span>
            ) : (
              <span>Calculated over active period days</span>
            )}
          </div>
        </div>

        {/* KPI 4: Top Category Impact */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Highest Outflow Category</span>
            <div
              className="kpi-icon-wrap"
              style={{ background: 'var(--warning-amber-subtle)', color: 'var(--warning-amber)' }}
            >
              <Layers size={18} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {topCategory ? (
              <>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: topCategory.color,
                    flexShrink: 0,
                  }}
                />
                <span title={topCategory.categoryName}>{topCategory.categoryName}</span>
              </>
            ) : (
              <span>None</span>
            )}
          </div>
          <div className="kpi-subtitle">
            {topCategory ? (
              <span>
                <strong>{formatCurrency(topCategory.totalAmount, currCode, currSymbol)}</strong> (
                {topCategory.percentOfTotal.toFixed(1)}% of all spending)
              </span>
            ) : (
              <span>No categories recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Primary Charts: Monthly Trend + Category Donut */}
      <div className="dashboard-grid-2">
        {/* Chart 1: Monthly Trend Bar Chart */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <div className="dashboard-card-title">
                <TrendingUp size={16} color="var(--primary)" />
                <span>12-Month Expense Trajectory ({year})</span>
              </div>
              <div className="dashboard-card-subtitle">
                Cash vs Cards monthly outflow with active month benchmark
              </div>
            </div>
          </div>
          <MonthlyTrendChart
            data={monthlyTrend}
            currencyCode={currCode}
            currencySymbol={currSymbol}
            selectedMonth={month}
            onSelectMonth={(m) => onMonthChange && onMonthChange(year, m)}
          />
        </div>

        {/* Chart 2: Category Allocation Donut Chart */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <div className="dashboard-card-title">
                <PieChart size={16} color="var(--credit-violet)" />
                <span>Category Outflow Distribution</span>
              </div>
              <div className="dashboard-card-subtitle">
                Percentage and proportional spend across categories
              </div>
            </div>
          </div>
          <CategoryDonutChart
            categories={categoryBreakdown}
            totalExpenses={summary.totalExpenses}
            currencyCode={currCode}
            currencySymbol={currSymbol}
          />
        </div>
      </div>

      {/* 4. Secondary Row: Daily Spending Pattern + Category Groups Breakdown */}
      <div className="dashboard-grid-2">
        {/* Daily Spending Timeline */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <div className="dashboard-card-title">
                <Calendar size={16} color="var(--cash-green)" />
                <span>
                  Daily Spending Rhythm ({data.monthName} {year})
                </span>
              </div>
              <div className="dashboard-card-subtitle">
                Day-by-day cash & card expenses identifying spike dates
              </div>
            </div>
          </div>
          <DailySpendingChart
            data={dailyTrend}
            currencyCode={currCode}
            currencySymbol={currSymbol}
          />
        </div>

        {/* Category Groups Breakdown */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <div className="dashboard-card-title">
                <Layers size={16} color="var(--card-blue)" />
                <span>Spending by Category Group</span>
              </div>
              <div className="dashboard-card-subtitle">
                Macro classification across living essentials, home, and discretionary
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            {groupBreakdown.length > 0 ? (
              groupBreakdown.map((g) => (
                <div key={g.groupName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>{g.groupName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tabular-nums" style={{ fontWeight: 700 }}>
                        {formatCurrency(g.totalAmount, currCode, currSymbol)}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          minWidth: '40px',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {g.percentOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(2, g.percentOfTotal)}%`,
                        background:
                          g.groupName.includes('Living') || g.groupName.includes('Essential')
                            ? 'var(--cash-green)'
                            : g.groupName.includes('Discretionary')
                            ? 'var(--credit-violet)'
                            : g.groupName.includes('Family') || g.groupName.includes('Home')
                            ? 'var(--primary)'
                            : 'var(--card-blue)',
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No grouped expenses recorded for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Tertiary Row: Payment Channels + Day of Week + Financial Accounts */}
      <div className="dashboard-grid-3">
        {/* Payment Channels Card */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <CreditCard size={16} color="var(--primary)" />
              <span>Payment Methods</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paymentMethodBreakdown.map((pm) => (
              <div
                key={pm.method}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {pm.method === 'cash' ? (
                      <Wallet size={16} color="var(--cash-green)" />
                    ) : (
                      <CreditCard size={16} color={pm.method === 'credit_card' ? 'var(--credit-violet)' : 'var(--card-blue)'} />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{pm.label}</span>
                  </div>
                  <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700 }}>
                    {formatCurrency(pm.amount, currCode, currSymbol)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pm.percent}%`,
                        background:
                          pm.method === 'cash'
                            ? 'var(--cash-green)'
                            : pm.method === 'credit_card'
                            ? 'var(--credit-violet)'
                            : 'var(--card-blue)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {pm.percent.toFixed(1)}% ({pm.count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day of Week Analysis */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <Calendar size={16} color="var(--credit-violet)" />
              <span>Weekday vs Weekend</span>
            </div>
          </div>
          <WeekdaySpendingChart
            data={weekdayBreakdown}
            currencyCode={currCode}
            currencySymbol={currSymbol}
          />
        </div>

        {/* Financial Accounts Outflow */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <Building2 size={16} color="var(--warning-amber)" />
              <span>Account Outflows</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {accountBreakdown.length > 0 ? (
              accountBreakdown.map((acc) => (
                <div
                  key={acc.accountId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{acc.accountName}</div>
                    {acc.institutionName && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {acc.institutionName}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontWeight: 700 }}>
                      {formatCurrency(acc.amount, currCode, currSymbol)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {acc.percent.toFixed(1)}% · {acc.count} txs
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No account disbursements recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Ranked Categories Table */}
      <div className="dashboard-card" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div className="dashboard-card-title">
              <Layers size={16} color="var(--primary)" />
              <span>Category Expense Leaderboard</span>
            </div>
            <div className="dashboard-card-subtitle">
              Ranked breakdown of all spending categories during this timeframe
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search filter */}
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '12px', width: '180px' }}
              />
            </div>

            {/* Sort Dropdown */}
            <select
              className="form-select"
              value={categorySortBy}
              onChange={(e) => setCategorySortBy(e.target.value as 'amount' | 'name' | 'count')}
              style={{ fontSize: '12px' }}
            >
              <option value="amount">Sort by Highest Spend</option>
              <option value="count">Sort by Frequency</option>
              <option value="name">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th>Category Name</th>
                <th>Category Group</th>
                <th style={{ textAlign: 'right' }}>Total Spent</th>
                <th style={{ width: '140px', textAlign: 'center' }}>% of Total</th>
                <th style={{ textAlign: 'center' }}>Transactions</th>
                <th style={{ textAlign: 'right' }}>Average Ticket</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((c, idx) => {
                  const rankClass =
                    idx === 0 ? 'rank-badge-1' : idx === 1 ? 'rank-badge-2' : idx === 2 ? 'rank-badge-3' : 'rank-badge-default';
                  return (
                    <tr key={c.categoryId}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rank-badge ${rankClass}`}>{idx + 1}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: c.color,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{c.categoryName}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                          }}
                        >
                          {c.groupName}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="tabular-nums" style={{ fontWeight: 700 }}>
                          {formatCurrency(c.totalAmount, currCode, currSymbol)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-track" style={{ flex: 1 }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.max(3, c.percentOfTotal)}%`,
                                backgroundColor: c.color,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              minWidth: '36px',
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {c.percentOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tabular-nums">{c.count}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(c.avgAmount, currCode, currSymbol)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No categories matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Top 10 Largest Single Outflows */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <div className="dashboard-card-title">
              <Receipt size={16} color="var(--danger-rose)" />
              <span>
                Top Largest Outflows {selectedHead ? `(${selectedHead.headIcon} ${selectedHead.headName})` : ''}
              </span>
            </div>
            <div className="dashboard-card-subtitle">
              Highest value individual transactions in this period {selectedHead ? `matching ${selectedHead.headName}` : ''}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="ledger-table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Date</th>
                <th>Description / Merchant</th>
                <th>Category</th>
                <th>Payment Channel</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {matchingTransactions.length > 0 ? (
                matchingTransactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id}>
                    <td className="tabular-nums" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {tx.date}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.description || tx.merchant || 'Expense'}</div>
                      {tx.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.notes}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: tx.category_color || 'var(--primary)',
                          }}
                        />
                        <span>{tx.category_name || 'Uncategorized'}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          tx.payment_method === 'cash'
                            ? 'badge-cash'
                            : tx.payment_method === 'credit_card'
                            ? 'badge-credit'
                            : 'badge-debit'
                        }`}
                      >
                        {tx.payment_method === 'cash'
                          ? 'Cash'
                          : tx.payment_method === 'credit_card'
                          ? 'Credit Card'
                          : 'Debit Card'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tx.account_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: 800,
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {formatCurrency(
                          scope === 'all' ? tx.amount_master_currency : tx.amount,
                          currCode,
                          currSymbol
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No transactions recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
