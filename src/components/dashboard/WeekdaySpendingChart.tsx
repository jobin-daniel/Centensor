'use client';

import React from 'react';
import { WeekdayExpenseItem, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface WeekdaySpendingChartProps {
  data: WeekdayExpenseItem[];
  currencyCode: CurrencyCode;
  currencySymbol?: string;
}

export default function WeekdaySpendingChart({
  data,
  currencyCode,
  currencySymbol,
}: WeekdaySpendingChartProps) {
  const maxVal = Math.max(...data.map((d) => d.totalExpenses), 1);
  const peakDay = data.reduce(
    (max, cur) => (cur.totalExpenses > max.totalExpenses ? cur : max),
    data[0]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <span>Spending by Day of Week</span>
        {peakDay && peakDay.totalExpenses > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Most Active: <strong style={{ color: 'var(--text-primary)' }}>{peakDay.dayName}</strong> ({peakDay.percentOfTotal.toFixed(1)}%)
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {data.map((d) => {
          const hPercent = maxVal > 0 ? (d.totalExpenses / maxVal) * 100 : 0;
          const isWeekend = d.dayName === 'Sat' || d.dayName === 'Sun';
          const isPeak = peakDay && d.dayName === peakDay.dayName && d.totalExpenses > 0;

          return (
            <div
              key={d.dayName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 4px',
                background: isPeak
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: isPeak ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              }}
              title={`${d.dayName}: ${formatCurrency(d.totalExpenses, currencyCode, currencySymbol)} (${d.count} transactions)`}
            >
              {/* Day Abbreviation */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isWeekend ? 'var(--credit-violet)' : isPeak ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                {d.dayName}
              </span>

              {/* Bar track */}
              <div
                style={{
                  width: '12px',
                  height: '65px',
                  background: 'var(--bg-app)',
                  borderRadius: 'var(--radius-full)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(4, hPercent)}%`,
                    background: isPeak
                      ? 'var(--primary)'
                      : isWeekend
                      ? 'var(--credit-violet)'
                      : 'var(--cash-green)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>

              {/* Amount */}
              <span
                className="tabular-nums"
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                }}
              >
                {d.totalExpenses > 0
                  ? d.totalExpenses >= 1000
                    ? `${Math.round(d.totalExpenses / 1000)}k`
                    : Math.round(d.totalExpenses)
                  : '-'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
