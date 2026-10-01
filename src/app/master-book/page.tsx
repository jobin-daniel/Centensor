'use client';

import React, { useState, useEffect } from 'react';
import { Globe2, TrendingUp, Layers, ArrowUpRight, DollarSign, RefreshCw } from 'lucide-react';
import { ConsolidatedMasterBookData } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

export default function MasterBookPage() {
  const [data, setData] = useState<ConsolidatedMasterBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  const fetchConsolidatedData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master-book?year=${year}&month=${month}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
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
        const res = await fetch(`/api/master-book?year=${year}&month=${month}`);
        const json = await res.json();
        if (!ignore && json.success) {
          setData(json.data);
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
  }, [year, month]);

  if (loading || !data) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Consolidated Master Book...
      </div>
    );
  }

  const masterCurr = data.masterCurrency;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Page Title & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
              <Globe2 size={20} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Consolidated Master Account Book</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Unified global overview consolidating all expenses from multiple countries and books into Master Reporting Currency (
            <strong>{masterCurr.name} [{masterCurr.code}]</strong>).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[2015, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
          >
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={fetchConsolidatedData} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Global Grand Total Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Consolidated Global Expenses ({data.monthName} {year})
          </span>
          <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {formatCurrency(data.grandTotalMasterExpenses, masterCurr.code, masterCurr.symbol)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge badge-cash" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Base Currency: {masterCurr.code} ({masterCurr.symbol})
          </span>
        </div>
      </div>

      {/* Book Breakdown Grid (Side by side comparison) */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '24px 0 12px' }}>
        Spending by Account Book / Country
      </h2>
      <div className="kpi-grid">
        {data.books.map((b) => (
          <div key={b.book.id} className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">{b.book.name}</span>
              <span className="badge badge-cash">{b.book.currency_code}</span>
            </div>
            <div className="kpi-value">
              {formatCurrency(b.totalMasterExpenses, masterCurr.code, masterCurr.symbol)}
            </div>
            <div className="kpi-subtitle" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Local: {formatCurrency(b.totalLocalExpenses, b.book.currency_code, b.book.currency_symbol)}</span>
              <span>{b.transactionCount} entries</span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Breakdown Table across all books */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '30px' }}>
        {/* Top Spending Categories */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--primary)" />
            <span>Category Spending in Master Currency</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.categoryTotals.filter((c) => c.totalMasterAmount > 0).map((c) => (
              <div
                key={c.category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.category.color || 'var(--primary)' }} />
                  <span style={{ fontWeight: 600 }}>{c.category.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className="tabular-nums" style={{ fontWeight: 700 }}>
                    {formatCurrency(c.totalMasterAmount, masterCurr.code, masterCurr.symbol)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
                    {c.percentOfTotal.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Month Annual Trend */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--cash-green)" />
            <span>12-Month Expense Trend ({year})</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {data.monthlyTrend.map((t, idx) => (
              <div
                key={t.monthStr}
                style={{
                  padding: '12px 10px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: idx + 1 === month ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {t.monthStr}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {t.totalMasterAmount > 0 ? Math.round(t.totalMasterAmount).toLocaleString() : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
