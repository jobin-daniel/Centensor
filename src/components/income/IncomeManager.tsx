'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Download,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Sprout,
  LineChart,
  Percent,
  Building2,
  Briefcase,
  Home,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Filter,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { AccountBook, Account, Transaction, IncomeDashboardData, IncomeType, IncomeStreamDefinition } from '@/lib/types';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { INCOME_STREAM_DEFINITIONS, getIncomeStreamDef } from '@/lib/income-taxonomies';
import IncomeModal from './IncomeModal';

interface IncomeManagerProps {
  books: AccountBook[];
  activeBookId: number;
  year: number;
  month: number;
  accounts: Account[];
  onBookChange: (bookId: number) => void;
  onMonthChange: (year: number, month: number) => void;
}

export default function IncomeManager({
  books,
  activeBookId,
  year,
  month,
  accounts,
  onBookChange,
  onMonthChange,
}: IncomeManagerProps) {
  const [selectedBookId, setSelectedBookId] = useState<string>(String(activeBookId));
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(month); // null = full year
  const [selectedIncomeType, setSelectedIncomeType] = useState<string>('');
  const [selectedRepaymentStatus, setSelectedRepaymentStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [incomeStreams, setIncomeStreams] = useState<IncomeStreamDefinition[]>(INCOME_STREAM_DEFINITIONS);
  const [data, setData] = useState<IncomeDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalInitialType, setModalInitialType] = useState<string>('salary');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchIncomeStreams = async () => {
    try {
      const res = await fetch('/api/income-types');
      const json = await res.json();
      if (json.success && Array.isArray(json.incomeTypes) && json.incomeTypes.length > 0) {
        setIncomeStreams(json.incomeTypes);
      }
    } catch (e) {
      console.error('Failed to fetch income types:', e);
    }
  };

  useEffect(() => {
    fetchIncomeStreams();
  }, []);

  const fetchIncomeData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedBookId) queryParams.set('bookId', selectedBookId);
      queryParams.set('year', String(selectedYear));
      if (selectedMonth !== null) queryParams.set('month', String(selectedMonth));
      if (selectedIncomeType) queryParams.set('incomeType', selectedIncomeType);
      if (selectedRepaymentStatus) queryParams.set('repaymentStatus', selectedRepaymentStatus);
      if (searchTerm.trim()) queryParams.set('search', searchTerm.trim());

      const res = await fetch(`/api/income?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error('Error fetching income data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeData();
  }, [selectedBookId, selectedYear, selectedMonth, selectedIncomeType, selectedRepaymentStatus]);

  // Handle Search submit / debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIncomeData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleOpenModal = (presetType: string = 'salary') => {
    setEditingTransaction(null);
    setModalInitialType(presetType);
    setIsModalOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalInitialType(tx.income_type || 'other');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income entry? The receiving account balance will be reverted.')) {
      return;
    }
    try {
      const res = await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchIncomeData();
      } else {
        alert(json.error || 'Failed to delete income entry');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting income entry');
    }
  };

  const handleToggleRepayment = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'repaid' ? 'pending' : 'repaid';
    try {
      const res = await fetch('/api/income', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_repayment', status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchIncomeData();
      }
    } catch (err) {
      console.error('Failed to toggle repayment status:', err);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.recentIncomes.length === 0) return;
    const headers = [
      'ID',
      'Date',
      'Book',
      'Stream Type',
      'Category',
      'Payer / Friend / Source',
      'Receiving Account',
      'Amount',
      'Currency',
      'Description',
      'Notes',
      'Repayment Due Date',
      'Repayment Status',
    ];
    const rows = data.recentIncomes.map((t) => [
      t.id,
      t.date,
      `"${t.book_name || ''}"`,
      t.income_type || 'other',
      `"${t.income_category || ''}"`,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      `"${t.account_name || ''}"`,
      t.amount,
      t.currency_code,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.repayment_due_date || '',
      t.repayment_status || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Centensor_Income_${selectedYear}_${selectedMonth ? selectedMonth : 'FullYear'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeBook = books.find((b) => b.id === Number(selectedBookId)) || books[0];
  const currencyCode = data?.summary.currency.code || activeBook?.currency_code || 'INR';
  const currencySymbol = data?.summary.currency.symbol || activeBook?.currency_symbol || '₹';

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Title & Quick Actions */}
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
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Income & Inflows
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Track and log salary, petty hand loans from friends, farm income, stock capital gains, and investments.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => handleOpenModal('salary')}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderColor: '#10b981',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Plus size={16} />
            <span>Log Income</span>
          </button>
        </div>
      </div>

      {/* Preset Quick-Log Action Chips */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '16px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          Quick Log:
        </span>
        {incomeStreams
          .filter((stream) => stream.is_active !== 0)
          .map((stream) => (
            <button
              key={stream.type}
              type="button"
              onClick={() => handleOpenModal(String(stream.type))}
              className="btn"
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: 'var(--radius-full)',
                background: `${stream.color || '#10b981'}18`,
                color: stream.color || '#10b981',
                border: `1px solid ${stream.color || '#10b981'}35`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{stream.icon} {stream.shortLabel}</span>
            </button>
          ))}

        <a
          href="/settings"
          className="btn"
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            border: '1px dashed var(--border-subtle)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          title="Configure income streams, labels, and categories in Settings"
        >
          <span>⚙️ Configure Streams</span>
        </a>
      </div>

      {/* Filter & Controls Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Book Selector & Period Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Book Switcher */}
          <select
            className="form-select"
            value={selectedBookId}
            onChange={(e) => {
              setSelectedBookId(e.target.value);
              if (e.target.value !== 'all') {
                onBookChange(parseInt(e.target.value, 10));
              }
            }}
            style={{ width: '190px' }}
          >
            <option value="all">🌐 All Books (Consolidated)</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.currency_code})
              </option>
            ))}
          </select>

          {/* Month / Year Capsule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 4px',
            }}
          >
            <button
              className="nav-arrow-btn"
              onClick={() => {
                if (selectedMonth === null || selectedMonth === 1) {
                  setSelectedYear(selectedYear - 1);
                  if (selectedMonth !== null) setSelectedMonth(12);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              title="Previous Month"
            >
              <ChevronLeft size={15} />
            </button>

            <span
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                minWidth: '130px',
                textAlign: 'center',
                userSelect: 'none',
              }}
            >
              {selectedMonth ? `${getMonthName(selectedMonth)} ${selectedYear}` : `Full Year ${selectedYear}`}
            </span>

            <button
              className="nav-arrow-btn"
              onClick={() => {
                if (selectedMonth === null || selectedMonth === 12) {
                  setSelectedYear(selectedYear + 1);
                  if (selectedMonth !== null) setSelectedMonth(1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              title="Next Month"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Full Year vs Specific Month Toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (selectedMonth === null) {
                setSelectedMonth(new Date().getMonth() + 1);
              } else {
                setSelectedMonth(null);
              }
            }}
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              background: selectedMonth === null ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
              color: selectedMonth === null ? 'var(--primary)' : 'var(--text-secondary)',
              borderColor: selectedMonth === null ? 'var(--border-accent)' : 'var(--border-subtle)',
            }}
          >
            {selectedMonth === null ? '📅 Switch to Month View' : '📊 View Entire Year'}
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search payer, friend, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '34px', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Stream Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedIncomeType('')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: !selectedIncomeType ? 'var(--primary)' : 'var(--bg-surface-elevated)',
            color: !selectedIncomeType ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: !selectedIncomeType ? 700 : 500,
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          All Incomes ({data?.summary.transactionCount || 0})
        </button>

        {incomeStreams.map((def) => {
          const isSelected = selectedIncomeType === def.type;
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => setSelectedIncomeType(isSelected ? '' : def.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: isSelected ? `1.5px solid ${def.color}` : '1px solid var(--border-subtle)',
                background: isSelected ? `linear-gradient(135deg, ${def.color}30, ${def.color}15)` : 'var(--bg-surface-elevated)',
                color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{def.icon}</span>
              <span>{def.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Total Inflows */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Income / Inflow
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cash-green)',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }} className="tabular-nums">
            {formatCurrency(data?.summary.totalIncome || 0, currencyCode, currencySymbol)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {data?.summary.transactionCount || 0} income receipts in period
          </div>
        </div>

        {/* Card 2: Petty Hand Loans */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🤝 Friends Hand Loans
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <HandCoins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }} className="tabular-nums">
            {formatCurrency(data?.summary.totalHandLoans || 0, currencyCode, currencySymbol)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {(data?.summary.pendingHandLoansCount || 0) > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                }}
              >
                ⏳ {data?.summary.pendingHandLoansCount} Pending Repayment
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#10b981' }}>✅ All settled</span>
            )}
          </div>
        </div>

        {/* Card 3: Farm & Agriculture Income */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🌱 Farm & Agriculture
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Sprout size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981' }} className="tabular-nums">
            {formatCurrency(data?.summary.totalFarmIncome || 0, currencyCode, currencySymbol)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Produce harvest, dairy & land leases
          </div>
        </div>

        {/* Card 4: Stocks & Investments */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📈 Stocks, Capital & Yield
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <LineChart size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a78bfa' }} className="tabular-nums">
            {formatCurrency(
              (data?.summary.totalStockCapital || 0) +
                (data?.summary.totalInvestment || 0) +
                (data?.summary.totalInterest || 0),
              currencyCode,
              currencySymbol
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Capital gains, dividends & interest
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Stream Breakdown + Monthly Trend */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Stream Breakdown Card */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Income Breakdown by Stream
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {data?.typeBreakdown.length || 0} active categories
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading stream metrics...
            </div>
          ) : !data || data.typeBreakdown.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No income entries recorded for this timeframe.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.typeBreakdown.map((item) => (
                <div key={item.type}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{item.icon}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({item.count})</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
                        {formatCurrency(item.totalAmount, currencyCode, currencySymbol)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {item.percentOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(Math.max(item.percentOfTotal, 2), 100)}%`,
                        background: item.color,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 12-Month Inflow Trend Bar Chart */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Monthly Inflow Trend ({selectedYear})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Year-to-date progression
            </span>
          </div>

          {loading || !data ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading chart...
            </div>
          ) : (
            <div>
              {/* SVG 12-Month Bar Chart */}
              {(() => {
                const maxVal = Math.max(...data.monthlyTrend.map((m) => m.totalIncome), 1);
                return (
                  <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 600 180" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[0, 0.33, 0.66, 1].map((p) => {
                        const y = 20 + 130 * (1 - p);
                        return (
                          <line
                            key={p}
                            x1="0"
                            y1={y}
                            x2="600"
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {/* Bars for 12 months */}
                      {data.monthlyTrend.map((item, idx) => {
                        const barWidth = 32;
                        const spacing = 600 / 12;
                        const x = idx * spacing + (spacing - barWidth) / 2;
                        const height = (item.totalIncome / maxVal) * 130;
                        const y = 150 - height;
                        const isSelected = selectedMonth === item.month;

                        return (
                          <g
                            key={item.month}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedMonth(item.month)}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(height, 2)}
                              rx={4}
                              fill={isSelected ? '#34d399' : 'url(#incomeBarGrad)'}
                              opacity={isSelected ? 1 : 0.8}
                            />
                            {/* Month label */}
                            <text
                              x={x + barWidth / 2}
                              y={170}
                              textAnchor="middle"
                              fill={isSelected ? '#34d399' : 'var(--text-muted)'}
                              fontSize="11"
                              fontWeight={isSelected ? 'bold' : 'normal'}
                            >
                              {item.monthStr}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* SPECIAL SECTION: PETTY HAND LOANS WATCHLIST */}
      {data && data.handLoans.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <HandCoins size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  🤝 Friends Petty Hand Loans Watchlist
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Track friendly borrowings, informal cash loans from friends/family, and repayment statuses.
                </p>
              </div>
            </div>

            <button
              className="btn"
              onClick={() => handleOpenModal('petty_hand_loan')}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '12px',
                padding: '6px 14px',
              }}
            >
              <Plus size={14} />
              <span>Log New Hand Loan</span>
            </button>
          </div>

          {/* Hand Loans Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '12px',
            }}
          >
            {data.handLoans.map((loan) => {
              const isRepaid = loan.repaymentStatus === 'repaid';
              return (
                <div
                  key={loan.id}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: isRepaid ? '1px solid var(--border-subtle)' : '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: isRepaid ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        👤 {loan.friendName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Borrowed on {loan.dateBorrowed} • {loan.accountName || 'Cash in Hand'}
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }} className="tabular-nums">
                      {formatCurrency(loan.amount, loan.currencyCode, loan.currencySymbol)}
                    </div>
                  </div>

                  {loan.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {loan.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      {loan.repaymentDueDate ? (
                        <span style={{ fontSize: '11px', color: isRepaid ? 'var(--text-muted)' : '#f59e0b', fontWeight: 600 }}>
                          Due: {loan.repaymentDueDate}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No due date specified</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRepayment(loan.id, loan.repaymentStatus)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isRepaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isRepaid ? '#34d399' : '#f59e0b',
                        transition: 'all 0.15s ease',
                      }}
                      title="Click to toggle loan repayment status"
                    >
                      {isRepaid ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Repaid (Click to Reopen)</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          <span>Pending (Click to Mark Repaid)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Income Records Table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Income Ledger & Inflow Records
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
              }}
            >
              {data?.recentIncomes.length || 0} entries
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Book</th>
                <th style={{ padding: '12px 16px' }}>Stream / Type</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Payer / Friend / Source</th>
                <th style={{ padding: '12px 16px' }}>Deposited Account</th>
                <th style={{ padding: '12px 16px' }}>Description / Notes</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading income records...
                  </td>
                </tr>
              ) : !data || data.recentIncomes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                      No income records match your filters.
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenModal('salary')}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderColor: '#10b981',
                        margin: '0 auto',
                      }}
                    >
                      <Plus size={15} />
                      <span>Log First Income</span>
                    </button>
                  </td>
                </tr>
              ) : (
                data.recentIncomes.map((tx) => {
                  const def = getIncomeStreamDef(tx.income_type);
                  const isHandLoan = tx.income_type === 'petty_hand_loan';
                  const isRepaid = tx.repayment_status === 'repaid';

                  return (
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
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: `${def.color}20`,
                            color: def.color,
                            border: `1px solid ${def.color}40`,
                          }}
                        >
                          <span>{def.icon}</span>
                          <span>{def.shortLabel}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        {tx.income_category || tx.category_name || '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {tx.merchant || '-'}
                        </span>
                        {isHandLoan && (
                          <div style={{ marginTop: '2px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleRepayment(tx.id, tx.repayment_status || 'pending')}
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                background: isRepaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isRepaid ? '#34d399' : '#f59e0b',
                                fontWeight: 700,
                              }}
                            >
                              {isRepaid ? '✅ Repaid' : '⏳ Pending'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {tx.account_name || 'Account'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{tx.description || '-'}</div>
                        {tx.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.notes}</div>}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: '#34d399',
                          fontSize: '14px',
                        }}
                        className="tabular-nums"
                      >
                        + {formatCurrency(tx.amount, tx.currency_code, tx.currency_symbol)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleEdit(tx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Edit Income Entry"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income Modal */}
      {isModalOpen && (
        <IncomeModal
          books={books}
          activeBookId={Number(selectedBookId) || activeBookId}
          accounts={accounts}
          initialType={modalInitialType}
          incomeTypes={incomeStreams}
          editTransaction={editingTransaction}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchIncomeData();
            fetchIncomeStreams();
          }}
        />
      )}
    </div>
  );
}
