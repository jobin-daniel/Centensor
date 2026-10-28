'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Copy,
  Wand2,
  Trash2,
  Download,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  Percent,
  Sliders,
  BarChart3,
  Calendar,
  Zap,
  Info,
  X,
  Plus,
} from 'lucide-react';
import {
  MonthlyBudgetData,
  AccountBook,
  CategoryBudgetDetail,
  HeadBudgetSummary,
  SmartBudgetRule,
} from '@/lib/types';
import { formatCurrency, getMonthName } from '@/lib/formatters';

interface MonthlyBudgetManagerProps {
  books: AccountBook[];
  activeBookId: number;
  year: number;
  month: number;
  onBookChange?: (bookId: number) => void;
  onMonthChange?: (year: number, month: number) => void;
  onOpenNewTxModal?: () => void;
}

type FilterStatus = 'all' | 'over' | 'warning' | 'safe' | 'unbudgeted' | 'zero';

export default function MonthlyBudgetManager({
  books,
  activeBookId,
  year,
  month,
  onBookChange,
  onMonthChange,
  onOpenNewTxModal,
}: MonthlyBudgetManagerProps) {
  const [data, setData] = useState<MonthlyBudgetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCategoryIds, setSavingCategoryIds] = useState<Set<number>>(new Set());
  const [savedSuccessIds, setSavedSuccessIds] = useState<Set<number>>(new Set());

  // Local budget draft values for responsive inline editing
  const [budgetDrafts, setBudgetDrafts] = useState<Record<number, string>>({});

  // View & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [collapsedHeads, setCollapsedHeads] = useState<Set<number>>(new Set());
  const [showAnnualChart, setShowAnnualChart] = useState(true);

  // Modals & Wizards
  const [isSmartWizardOpen, setIsSmartWizardOpen] = useState(false);
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkPercent, setBulkPercent] = useState<string>('5');
  const [bulkDirection, setBulkDirection] = useState<'increase' | 'decrease'>('increase');
  const [isApplyingRule, setIsApplyingRule] = useState(false);

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  // Fetch Budget Data
  const fetchBudgetData = async () => {
    if (!activeBookId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?bookId=${activeBookId}&year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        // Initialize budget drafts
        const drafts: Record<number, string> = {};
        json.data.allCategories.forEach((c: CategoryBudgetDetail) => {
          drafts[c.categoryId] = c.budget > 0 ? String(c.budget) : '';
        });
        setBudgetDrafts(drafts);
      }
    } catch (err) {
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!activeBookId) return;
      try {
        const res = await fetch(`/api/budgets?bookId=${activeBookId}&year=${year}&month=${month}`);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setData(json.data);
          const drafts: Record<number, string> = {};
          json.data.allCategories.forEach((c: CategoryBudgetDetail) => {
            drafts[c.categoryId] = c.budget > 0 ? String(c.budget) : '';
          });
          setBudgetDrafts(drafts);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading budget data:', err);
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeBookId, year, month]);

  // Handle single category budget save
  const handleSaveBudget = async (categoryId: number, valueStr: string) => {
    const numValue = Math.max(0, parseFloat(valueStr) || 0);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    // Mark category as saving
    setSavingCategoryIds((prev) => new Set(prev).add(categoryId));

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_single',
          bookId: activeBookId,
          month: monthStr,
          categoryId,
          amount: numValue,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Show success indicator flash
        setSavedSuccessIds((prev) => new Set(prev).add(categoryId));
        setTimeout(() => {
          setSavedSuccessIds((prev) => {
            const next = new Set(prev);
            next.delete(categoryId);
            return next;
          });
        }, 1500);
        // Refresh data quietly in background
        const reloadRes = await fetch(`/api/budgets?bookId=${activeBookId}&year=${year}&month=${month}`);
        const reloadJson = await reloadRes.json();
        if (reloadJson.success && reloadJson.data) {
          setData(reloadJson.data);
        }
      }
    } catch (e) {
      console.error('Error saving budget:', e);
    } finally {
      setSavingCategoryIds((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  // Quick fill single category
  const handleQuickFill = (categoryId: number, amount: number) => {
    setBudgetDrafts((prev) => ({ ...prev, [categoryId]: String(amount) }));
    handleSaveBudget(categoryId, String(amount));
  };

  // Apply Smart Rule (e.g. 3-month avg, previous actual, etc.)
  const handleApplySmartRule = async (rule: SmartBudgetRule) => {
    setIsApplyingRule(true);
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'smart_fill',
          bookId: activeBookId,
          targetMonth,
          rule,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsSmartWizardOpen(false);
        fetchBudgetData();
      } else {
        alert(json.error || 'Failed to apply smart budget rule');
      }
    } catch (err) {
      console.error('Error applying smart rule:', err);
      alert('An error occurred while applying budget rule');
    } finally {
      setIsApplyingRule(false);
    }
  };

  // Copy from Previous Month
  const handleCopyFromPreviousMonth = async () => {
    if (!data) return;
    setIsApplyingRule(true);
    const targetMonth = `${year}-${String(month).padStart(2, '0')}`;

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy_previous',
          bookId: activeBookId,
          targetMonth,
          sourceMonth: data.previousMonthStr,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsSmartWizardOpen(false);
        fetchBudgetData();
      } else {
        alert(json.error || 'Failed to copy budgets');
      }
    } catch (err) {
      console.error('Error copying budgets:', err);
    } finally {
      setIsApplyingRule(false);
    }
  };

  // Bulk percentage adjustment
  const handleApplyBulkAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const pct = parseFloat(bulkPercent) || 0;
    if (pct <= 0) return;

    const factor = bulkDirection === 'increase' ? 1 + pct / 100 : Math.max(0, 1 - pct / 100);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const newItems = data.allCategories
      .filter((c) => c.budget > 0)
      .map((c) => ({
        categoryId: c.categoryId,
        amount: Math.round(c.budget * factor),
      }));

    if (newItems.length === 0) {
      alert('No active budgets found to adjust. Set at least one budget first!');
      return;
    }

    setIsApplyingRule(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_multiple',
          bookId: activeBookId,
          month: monthStr,
          budgets: newItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsBulkAdjustOpen(false);
        fetchBudgetData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplyingRule(false);
    }
  };

  // Clear Month Budgets
  const handleClearMonth = async () => {
    if (!confirm(`Are you sure you want to clear all budgets for ${data?.monthName} ${year}?`)) {
      return;
    }
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_month',
          bookId: activeBookId,
          month: monthStr,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchBudgetData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Main Head',
      'Sub Category',
      'Budget Amount',
      'Actual Spent',
      'Variance (Surplus/Deficit)',
      'Utilization %',
      'Status',
      'Prev Month Budget',
      'Prev Month Spent',
      '3-Month Avg Spent',
    ];

    const rows = data.allCategories.map((c) => [
      `"${c.groupName}"`,
      `"${c.categoryName}"`,
      c.budget,
      c.spent,
      c.variance,
      `${c.utilizationPercent.toFixed(1)}%`,
      `"${c.status}"`,
      c.prevMonthBudget,
      c.prevMonthSpent,
      c.avg3MonthSpent,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Budget_${data.book.name}_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Collapse / Expand toggles
  const toggleCollapseHead = (headId: number) => {
    setCollapsedHeads((prev) => {
      const next = new Set(prev);
      if (next.has(headId)) next.delete(headId);
      else next.add(headId);
      return next;
    });
  };

  const toggleCollapseAll = () => {
    if (!data) return;
    if (collapsedHeads.size === data.heads.length) {
      setCollapsedHeads(new Set());
    } else {
      setCollapsedHeads(new Set(data.heads.map((h) => h.headId)));
    }
  };

  // Filter and Search
  const filteredHeads = useMemo(() => {
    if (!data) return [];
    return data.heads
      .map((head) => {
        const matchingCats = head.categories.filter((cat) => {
          // Search matching
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchName = cat.categoryName.toLowerCase().includes(q);
            const matchGroup = cat.groupName.toLowerCase().includes(q);
            if (!matchName && !matchGroup) return false;
          }

          // Status filter matching
          if (statusFilter === 'over') return cat.status === 'danger';
          if (statusFilter === 'warning') return cat.status === 'warning';
          if (statusFilter === 'safe') return cat.status === 'safe' && cat.budget > 0;
          if (statusFilter === 'unbudgeted') return cat.status === 'unbudgeted';
          if (statusFilter === 'zero') return cat.status === 'zero_spend';
          return true;
        });

        return {
          ...head,
          categories: matchingCats,
        };
      })
      .filter((head) => head.categories.length > 0);
  }, [data, searchQuery, statusFilter]);

  if (loading && !data) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw className="spin" size={26} style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading Monthly Budgeting Workspace...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No budget data available.
      </div>
    );
  }

  const { summary, book, historicalMonthlyComparison } = data;
  const currCode = book.currency_code;
  const currSymbol = book.currency_symbol;
  const allCollapsed = collapsedHeads.size === data.heads.length;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '24px 0 20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(139, 92, 246, 0.25))',
                borderRadius: 'var(--radius-md)',
                color: 'var(--cash-green)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Target size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Monthly Budget Planner</h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                  }}
                >
                  {data.monthName} {year}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Set monthly category budgets, track real-time variance, and forecast burn rate for{' '}
                <strong>{book.name}</strong> ({currCode}).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Smart Budget Wizard Button */}
          <button
            className="btn btn-primary"
            onClick={() => setIsSmartWizardOpen(true)}
            style={{ fontWeight: 700 }}
            title="Auto-fill or copy budgets from historical spending"
          >
            <Sparkles size={15} />
            <span>Smart Budget Wizard</span>
          </button>

          {/* Bulk Adjust Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsBulkAdjustOpen(true)}
            title="Adjust existing budgets by percentage"
          >
            <Percent size={14} />
            <span>Adjust All</span>
          </button>

          {/* Toggle Annual Trend Chart */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowAnnualChart(!showAnnualChart)}
            title="Toggle 12-Month Budget vs Actuals Chart"
          >
            <BarChart3 size={14} color={showAnnualChart ? 'var(--primary)' : 'currentColor'} />
            <span>{showAnnualChart ? 'Hide Trend' : 'View Trend'}</span>
          </button>

          {/* Export CSV */}
          <button className="btn btn-secondary" onClick={handleExportCSV} title="Export Budget CSV">
            <Download size={14} />
            <span>Export</span>
          </button>

          {/* Refresh */}
          <button className="btn btn-secondary" onClick={fetchBudgetData} title="Refresh Budgets">
            <RefreshCw size={14} />
          </button>

          {/* Clear Month */}
          {summary.totalBudget > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleClearMonth}
              title="Clear all budgets for this month"
              style={{ color: 'var(--danger-rose)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        {/* Card 1: Total Budget */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Month Budget</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(summary.totalBudget, currCode, currSymbol)}</div>
          <div className="kpi-subtitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {summary.budgetedCategoriesCount} of {summary.totalCategoriesCount} categories budgeted
            </span>
            {summary.previousMonthTotalBudget > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Prev Mo: {formatCurrency(summary.previousMonthTotalBudget, currCode, currSymbol)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Actual Spent */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Actual Expenses Spent</span>
            <div className="kpi-icon-wrap" style={{ background: 'var(--credit-violet-subtle)', color: 'var(--credit-violet)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value">{formatCurrency(summary.totalSpent, currCode, currSymbol)}</div>
          <div className="kpi-subtitle">
            <span>Daily Velocity: {formatCurrency(summary.dailyAvgSpent, currCode, currSymbol)} / day</span>
          </div>
        </div>

        {/* Card 3: Budget Variance (Remaining Surplus / Deficit) */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Remaining Surplus / Deficit</span>
            <div
              className="kpi-icon-wrap"
              style={{
                background: summary.isOverBudget ? 'var(--danger-rose-subtle)' : 'var(--cash-green-subtle)',
                color: summary.isOverBudget ? 'var(--danger-rose)' : 'var(--cash-green)',
              }}
            >
              {summary.isOverBudget ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </div>
          </div>
          <div
            className="kpi-value"
            style={{ color: summary.isOverBudget ? 'var(--danger-rose)' : 'var(--cash-green)' }}
          >
            {summary.totalBudget > 0 ? (
              summary.isOverBudget
                ? `-${formatCurrency(Math.abs(summary.variance), currCode, currSymbol)}`
                : `+${formatCurrency(summary.variance, currCode, currSymbol)}`
            ) : (
              'No Budget Set'
            )}
          </div>
          <div className="kpi-subtitle">
            {summary.totalBudget > 0 ? (
              summary.isOverBudget ? (
                <span style={{ color: 'var(--danger-rose)' }}>
                  Exceeded monthly budget by {formatCurrency(Math.abs(summary.variance), currCode, currSymbol)}
                </span>
              ) : (
                <span style={{ color: 'var(--cash-green)' }}>
                  Safe: {formatCurrency(summary.variance, currCode, currSymbol)} remaining to spend
                </span>
              )
            ) : (
              <span>Click Smart Budget Wizard to set monthly targets</span>
            )}
          </div>
        </div>

        {/* Card 4: Overall Utilization & Forecast */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Budget Utilization Rate</span>
            <div
              className="kpi-icon-wrap"
              style={{
                background:
                  summary.utilizationPercent > 100
                    ? 'var(--danger-rose-subtle)'
                    : summary.utilizationPercent >= 80
                    ? 'var(--warning-amber-subtle)'
                    : 'var(--cash-green-subtle)',
                color:
                  summary.utilizationPercent > 100
                    ? 'var(--danger-rose)'
                    : summary.utilizationPercent >= 80
                    ? 'var(--warning-amber)'
                    : 'var(--cash-green)',
              }}
            >
              <Percent size={18} />
            </div>
          </div>
          <div className="kpi-value">{summary.totalBudget > 0 ? `${summary.utilizationPercent.toFixed(1)}%` : '0%'}</div>
          <div style={{ marginTop: '6px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--border-subtle)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, summary.utilizationPercent)}%`,
                  height: '100%',
                  background:
                    summary.utilizationPercent > 100
                      ? 'var(--danger-rose)'
                      : summary.utilizationPercent >= 80
                      ? 'var(--warning-amber)'
                      : 'var(--cash-green)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
          <div className="kpi-subtitle" style={{ marginTop: '6px' }}>
            <span>
              EOM Projected Spend: <strong>{formatCurrency(summary.projectedEOMSpend, currCode, currSymbol)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Empty State Callout when $0 is budgeted for the month */}
      {summary.totalBudget === 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.08))',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>
                No budget set for {data.monthName} {year} yet
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Quickly provision your monthly targets using smart benchmarks or copy from previous months with 1 click.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {summary.previousMonthTotalBudget > 0 && (
              <button className="btn btn-primary" onClick={handleCopyFromPreviousMonth} disabled={isApplyingRule}>
                <Copy size={14} />
                <span>Copy from {getMonthName(month === 1 ? 12 : month - 1)}</span>
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => handleApplySmartRule('3month_avg')} disabled={isApplyingRule}>
              <Zap size={14} color="var(--primary)" />
              <span>Auto-Fill from 3-Mo Avg</span>
            </button>
            <button className="btn btn-secondary" onClick={() => setIsSmartWizardOpen(true)}>
              <Wand2 size={14} />
              <span>Explore All Smart Rules</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Annual 12-Month Budget vs Actual Trend Chart */}
      {showAnnualChart && historicalMonthlyComparison && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: '24px',
          }}
        >
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
              <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" />
                <span>{year} Annual Budget vs Actual Spending Trajectory</span>
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                12-month timeline comparing monthly budget allocations against actual recorded expenses.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.2)', border: '1px dashed rgba(255, 255, 255, 0.5)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Budget Target</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Actual Spent</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', alignItems: 'flex-end', height: '180px', paddingTop: '20px' }}>
            {(() => {
              const maxVal = Math.max(
                1,
                ...historicalMonthlyComparison.map((m) => Math.max(m.budget, m.spent))
              );

              return historicalMonthlyComparison.map((m) => {
                const isSelected = m.month === month;
                const budgetHeight = Math.round((m.budget / maxVal) * 130);
                const spentHeight = Math.round((m.spent / maxVal) * 130);
                const isOver = m.budget > 0 && m.spent > m.budget;

                return (
                  <div
                    key={m.month}
                    onClick={() => onMonthChange && onMonthChange(year, m.month)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    title={`${m.monthStr} ${year}: Budget ${formatCurrency(m.budget, currCode, currSymbol)} | Spent ${formatCurrency(m.spent, currCode, currSymbol)} (Click to jump)`}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px', width: '100%', justifyContent: 'center' }}>
                      {/* Budget Bar */}
                      <div
                        style={{
                          width: '12px',
                          height: `${Math.max(4, budgetHeight)}px`,
                          background: 'rgba(255, 255, 255, 0.12)',
                          border: '1px dashed rgba(255, 255, 255, 0.35)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      {/* Actual Spent Bar */}
                      <div
                        style={{
                          width: '12px',
                          height: `${Math.max(4, spentHeight)}px`,
                          background: isOver
                            ? 'linear-gradient(180deg, #f43f5e, #be123c)'
                            : isSelected
                            ? 'linear-gradient(180deg, #ec4899, #8b5cf6)'
                            : 'linear-gradient(180deg, #8b5cf6, #6366f1)',
                          borderRadius: '4px 4px 0 0',
                          boxShadow: isSelected ? '0 0 10px rgba(236, 72, 153, 0.5)' : 'none',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: isSelected ? 800 : 500,
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        marginTop: '6px',
                      }}
                    >
                      {m.monthStr}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* 5. Search, Filter & View Controls */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search category or head..."
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', fontSize: '13px' }}
            />
          </div>

          {/* Status Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${data.allCategories.length})` },
              { id: 'over', label: `Over Budget (${summary.overBudgetCategoriesCount})`, color: 'var(--danger-rose)' },
              { id: 'warning', label: 'Near Limit (80-100%)', color: 'var(--warning-amber)' },
              { id: 'safe', label: `On Track (${summary.underBudgetCategoriesCount})`, color: 'var(--cash-green)' },
              { id: 'unbudgeted', label: `Unbudgeted (${summary.unbudgetedCategoriesCount})`, color: '#a855f7' },
              { id: 'zero', label: 'Zero Spend' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as FilterStatus)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: statusFilter === f.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: statusFilter === f.id ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
                  color: statusFilter === f.id ? '#ffffff' : f.color || 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expand / Collapse All */}
        <button
          className="btn btn-secondary"
          onClick={toggleCollapseAll}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          {allCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
          <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
        </button>
      </div>

      {/* 6. Hierarchical Main Heads & Categories Budget Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredHeads.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 20px',
              textAlign: 'center',
            }}
          >
            <Filter size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No categories match current filters</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Try clearing the search box or selecting &quot;All&quot; categories filter.
            </p>
            <button className="btn btn-secondary" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          filteredHeads.map((head) => {
            const isCollapsed = collapsedHeads.has(head.headId);
            const headSpent = head.totalSpent;
            const headBudget = head.totalBudget;
            const headVariance = head.variance;
            const isHeadOver = head.isOverBudget;
            const headUtil = head.utilizationPercent;

            return (
              <div
                key={head.headId}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* Main Head Group Card Header */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-surface-elevated)',
                    borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleCollapseHead(head.headId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: head.headColor ? `${head.headColor}22` : 'var(--primary-subtle)',
                        border: `1px solid ${head.headColor || 'var(--primary)'}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      {head.headIcon || '📁'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {head.headName}
                        </span>
                        <span
                          className="badge"
                          style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', fontSize: '11px' }}
                        >
                          {head.categories.length} {head.categories.length === 1 ? 'Category' : 'Categories'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Head Summary Numbers & Progress Meter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Head Budget vs Spent */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Budgeted Target</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {headBudget > 0 ? formatCurrency(headBudget, currCode, currSymbol) : '₹0 (Unbudgeted)'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actual Spent</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(headSpent, currCode, currSymbol)}
                      </div>
                    </div>

                    {/* Head Variance */}
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Head Variance</div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: headBudget > 0 ? (isHeadOver ? 'var(--danger-rose)' : 'var(--cash-green)') : 'var(--text-muted)',
                        }}
                      >
                        {headBudget > 0 ? (
                          isHeadOver ? `-${formatCurrency(Math.abs(headVariance), currCode, currSymbol)}` : `+${formatCurrency(headVariance, currCode, currSymbol)}`
                        ) : '-'}
                      </div>
                    </div>

                    {/* Head Progress Bar */}
                    <div style={{ width: '90px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        <span>Used</span>
                        <span style={{ fontWeight: 700, color: isHeadOver ? 'var(--danger-rose)' : 'var(--text-primary)' }}>
                          {headBudget > 0 ? `${Math.round(headUtil)}%` : '0%'}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'var(--border-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, headUtil)}%`,
                            height: '100%',
                            background: isHeadOver ? 'var(--danger-rose)' : headUtil >= 80 ? 'var(--warning-amber)' : 'var(--cash-green)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subcategory Rows Table */}
                {!isCollapsed && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          <th style={{ padding: '10px 20px', fontWeight: 700 }}>Category</th>
                          <th style={{ padding: '10px 16px', fontWeight: 700, width: '130px' }}>Status</th>
                          <th style={{ padding: '10px 16px', fontWeight: 700, width: '220px' }}>Benchmarks & Quick Fill</th>
                          <th style={{ padding: '10px 16px', fontWeight: 700, width: '170px' }}>Monthly Budget</th>
                          <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right', width: '140px' }}>Actual Spent</th>
                          <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right', width: '140px' }}>Variance</th>
                          <th style={{ padding: '10px 20px', fontWeight: 700, width: '120px' }}>Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {head.categories.map((cat) => {
                          const isSaving = savingCategoryIds.has(cat.categoryId);
                          const isSavedSuccess = savedSuccessIds.has(cat.categoryId);
                          const draftVal = budgetDrafts[cat.categoryId] ?? (cat.budget > 0 ? String(cat.budget) : '');
                          const isOver = cat.status === 'danger';
                          const isWarn = cat.status === 'warning';

                          return (
                            <tr
                              key={cat.categoryId}
                              style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                background: isOver ? 'rgba(244, 63, 94, 0.04)' : 'transparent',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              {/* 1. Category Name & Icon */}
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      backgroundColor: cat.color || head.headColor || 'var(--primary)',
                                      flexShrink: 0,
                                    }}
                                  />
                                  {cat.icon && <span style={{ fontSize: '15px' }}>{cat.icon}</span>}
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{cat.categoryName}</div>
                                    {cat.transactionCount > 0 && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {cat.transactionCount} {cat.transactionCount === 1 ? 'transaction' : 'transactions'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Status Badge */}
                              <td style={{ padding: '12px 16px' }}>
                                {cat.status === 'danger' && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(244, 63, 94, 0.15)',
                                      color: 'var(--danger-rose)',
                                      border: '1px solid rgba(244, 63, 94, 0.3)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    Over Budget
                                  </span>
                                )}
                                {cat.status === 'warning' && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      color: 'var(--warning-amber)',
                                      border: '1px solid rgba(245, 158, 11, 0.3)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    Near Limit ({Math.round(cat.utilizationPercent)}%)
                                  </span>
                                )}
                                {cat.status === 'safe' && cat.budget > 0 && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: 'var(--cash-green)',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    On Track
                                  </span>
                                )}
                                {cat.status === 'unbudgeted' && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(168, 85, 247, 0.15)',
                                      color: '#a855f7',
                                      border: '1px solid rgba(168, 85, 247, 0.3)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    Unbudgeted
                                  </span>
                                )}
                                {cat.status === 'zero_spend' && (
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-muted)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    Zero Spend
                                  </span>
                                )}
                              </td>

                              {/* 3. Benchmarks & Quick Fill */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span>Last Mo: {cat.prevMonthBudget > 0 ? formatCurrency(cat.prevMonthBudget, currCode, currSymbol) : '-'}</span>
                                    <span>•</span>
                                    <span>3M Avg: {cat.avg3MonthSpent > 0 ? formatCurrency(cat.avg3MonthSpent, currCode, currSymbol) : '-'}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {cat.prevMonthBudget > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickFill(cat.categoryId, cat.prevMonthBudget)}
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.06)',
                                          border: '1px solid var(--border-subtle)',
                                          color: 'var(--text-secondary)',
                                          fontSize: '10px',
                                          cursor: 'pointer',
                                        }}
                                        title={`Set budget to last month's target (${cat.prevMonthBudget})`}
                                      >
                                        = Last Mo
                                      </button>
                                    )}
                                    {cat.avg3MonthSpent > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickFill(cat.categoryId, cat.avg3MonthSpent)}
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.06)',
                                          border: '1px solid var(--border-subtle)',
                                          color: 'var(--text-secondary)',
                                          fontSize: '10px',
                                          cursor: 'pointer',
                                        }}
                                        title={`Set budget to 3-month average (${cat.avg3MonthSpent})`}
                                      >
                                        = 3M Avg
                                      </button>
                                    )}
                                    {cat.spent > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickFill(cat.categoryId, Math.round(cat.spent))}
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 255, 255, 0.06)',
                                          border: '1px solid var(--border-subtle)',
                                          color: 'var(--text-secondary)',
                                          fontSize: '10px',
                                          cursor: 'pointer',
                                        }}
                                        title={`Match current actual spend (${Math.round(cat.spent)})`}
                                      >
                                        = Spent
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 4. Inline Editable Budget Input */}
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ position: 'relative', width: '140px' }}>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    className="form-input"
                                    value={draftVal}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBudgetDrafts((prev) => ({ ...prev, [cat.categoryId]: val }));
                                    }}
                                    onBlur={(e) => handleSaveBudget(cat.categoryId, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    style={{
                                      width: '100%',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 700,
                                      paddingRight: '28px',
                                      fontSize: '13px',
                                      borderColor: isSavedSuccess ? 'var(--cash-green)' : isOver ? 'var(--danger-rose)' : undefined,
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: '8px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      pointerEvents: 'none',
                                    }}
                                  >
                                    {isSaving && <RefreshCw size={12} className="spin" color="var(--primary)" />}
                                    {isSavedSuccess && !isSaving && <Check size={14} color="var(--cash-green)" />}
                                  </div>
                                </div>
                              </td>

                              {/* 5. Actual Spent */}
                              <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                {cat.spent > 0 ? formatCurrency(cat.spent, currCode, currSymbol) : '-'}
                              </td>

                              {/* 6. Variance Remaining */}
                              <td
                                style={{
                                  padding: '12px 16px',
                                  textAlign: 'right',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 800,
                                  color: cat.budget > 0 ? (isOver ? 'var(--danger-rose)' : 'var(--cash-green)') : 'var(--text-muted)',
                                }}
                              >
                                {cat.budget > 0 ? (
                                  isOver ? (
                                    <span>-{formatCurrency(Math.abs(cat.variance), currCode, currSymbol)}</span>
                                  ) : (
                                    <span>+{formatCurrency(cat.variance, currCode, currSymbol)}</span>
                                  )
                                ) : (
                                  '-'
                                )}
                              </td>

                              {/* 7. Utilization Bar */}
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Used</span>
                                    <span style={{ fontWeight: 700, color: isOver ? 'var(--danger-rose)' : 'var(--text-primary)' }}>
                                      {cat.budget > 0 ? `${cat.utilizationPercent.toFixed(0)}%` : '0%'}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '5px',
                                      background: 'var(--border-subtle)',
                                      borderRadius: '999px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.min(100, cat.utilizationPercent)}%`,
                                        height: '100%',
                                        background: isOver ? 'var(--danger-rose)' : isWarn ? 'var(--warning-amber)' : 'var(--cash-green)',
                                        borderRadius: '999px',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* SMART BUDGET WIZARD MODAL */}
      {/* ========================================================= */}
      {isSmartWizardOpen && (
        <div className="modal-overlay" onClick={() => setIsSmartWizardOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Sparkles size={16} />
                </div>
                <h2 className="modal-title">Smart Budget Provisioning Wizard</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsSmartWizardOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Select a smart rule to instantly generate and allocate category budgets for{' '}
                <strong>{data.monthName} {year}</strong> based on historical financial velocity.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Option 1: Copy from previous month */}
                <button
                  type="button"
                  disabled={isApplyingRule}
                  onClick={handleCopyFromPreviousMonth}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                      <Copy size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Copy from Previous Month ({data.previousMonthStr})
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Replicate last month&apos;s exact category budget allocations ({formatCurrency(summary.previousMonthTotalBudget, currCode, currSymbol)})
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>

                {/* Option 2: 3-Month Trailing Average */}
                <button
                  type="button"
                  disabled={isApplyingRule}
                  onClick={() => handleApplySmartRule('3month_avg')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--cash-green-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--cash-green)' }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        3-Month Trailing Average Spend
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Set each category budget equal to its true 3-month average actual expenses
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>

                {/* Option 3: Previous Month Actuals */}
                <button
                  type="button"
                  disabled={isApplyingRule}
                  onClick={() => handleApplySmartRule('prev_month_actual')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--credit-violet-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--credit-violet)' }}>
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Previous Month Actual Expenses
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Base new budget targets directly on last month&apos;s actual expenditure ({formatCurrency(summary.previousMonthTotalSpent, currCode, currSymbol)})
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>

                {/* Option 4: Previous Budget + 5% */}
                <button
                  type="button"
                  disabled={isApplyingRule}
                  onClick={() => handleApplySmartRule('prev_budget_plus_5')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: 'var(--radius-sm)', color: '#ec4899' }}>
                      <Percent size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Previous Budget + 5% Inflation Buffer
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Copy previous budget with a 5% upward adjustment for seasonal growth
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>

                {/* Option 5: Previous Budget - 5% */}
                <button
                  type="button"
                  disabled={isApplyingRule}
                  onClick={() => handleApplySmartRule('prev_budget_minus_5')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--warning-amber-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--warning-amber)' }}>
                      <TrendingDown size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Lean Budget (-5% Savings Target)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Reduce previous budget allocations by 5% to enforce frugality
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </button>
              </div>

              {isApplyingRule && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '13px', justifyContent: 'center' }}>
                  <RefreshCw size={14} className="spin" />
                  <span>Applying smart budget rules...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK ADJUST MODAL */}
      {/* ========================================================= */}
      {isBulkAdjustOpen && (
        <div className="modal-overlay" onClick={() => setIsBulkAdjustOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Bulk Percentage Adjustment</h2>
              <button className="modal-close-btn" onClick={() => setIsBulkAdjustOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyBulkAdjust} className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Scale all existing category budgets for {data.monthName} {year} simultaneously by a given percentage.
              </p>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Adjustment Direction</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setBulkDirection('increase')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: bulkDirection === 'increase' ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
                      border: bulkDirection === 'increase' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      color: bulkDirection === 'increase' ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    + Increase (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDirection('decrease')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: bulkDirection === 'decrease' ? 'var(--warning-amber-subtle)' : 'var(--bg-surface-elevated)',
                      border: bulkDirection === 'decrease' ? '1px solid var(--warning-amber)' : '1px solid var(--border-subtle)',
                      color: bulkDirection === 'decrease' ? 'var(--warning-amber)' : 'var(--text-primary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    - Reduce (-)
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Percentage (%)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  required
                  className="form-input"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  placeholder="e.g. 5, 10, 15"
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkAdjustOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isApplyingRule}>
                  {isApplyingRule ? 'Adjusting...' : 'Apply Bulk Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
