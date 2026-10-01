'use client';

import React, { useState } from 'react';
import { DailyExpenseItem, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface DailySpendingChartProps {
  data: DailyExpenseItem[];
  currencyCode: CurrencyCode;
  currencySymbol?: string;
}

export default function DailySpendingChart({
  data,
  currencyCode,
  currencySymbol,
}: DailySpendingChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No daily spending recorded for this month.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.totalExpenses), 1);
  const peakDay = data.reduce(
    (max, cur) => (cur.totalExpenses > max.totalExpenses ? cur : max),
    data[0]
  );

  const chartHeight = 150;
  const paddingTop = 16;
  const paddingBottom = 24;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Subheader info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <span>Daily Expenses (Days 1 – {data.length})</span>
        {peakDay && peakDay.totalExpenses > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--warning-amber)' }}>
            Peak Day: Day {peakDay.day} ({peakDay.dayOfWeek}) —{' '}
            <strong>{formatCurrency(peakDay.totalExpenses, currencyCode, currencySymbol)}</strong>
          </span>
        )}
      </div>

      <div style={{ position: 'relative', height: `${chartHeight}px`, width: '100%' }}>
        <svg
          viewBox={`0 0 1000 ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct) => {
            const y = paddingTop + usableHeight * (1 - pct);
            return (
              <line
                key={pct}
                x1="0"
                y1={y}
                x2="1000"
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray={pct === 0 ? 'none' : '3 3'}
                strokeWidth={pct === 0 ? 1.5 : 0.8}
              />
            );
          })}

          {/* Daily Bars */}
          {data.map((item, idx) => {
            const slotWidth = 1000 / data.length;
            const barWidth = Math.max(12, slotWidth - 6);
            const x = idx * slotWidth + (slotWidth - barWidth) / 2;

            const h = (item.totalExpenses / maxVal) * usableHeight;
            const y = paddingTop + usableHeight - h;

            const isWeekend = item.dayOfWeek === 'Sat' || item.dayOfWeek === 'Sun';
            const isPeak = peakDay && item.day === peakDay.day && item.totalExpenses > 0;
            const isHovered = hoveredDay === item.day;

            return (
              <g
                key={item.day}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredDay(item.day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Column highlight */}
                {isHovered && (
                  <rect
                    x={idx * slotWidth + 1}
                    y={paddingTop}
                    width={slotWidth - 2}
                    height={usableHeight}
                    fill="rgba(255, 255, 255, 0.05)"
                    rx="2"
                  />
                )}

                {item.totalExpenses > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(2, h)}
                    rx="3"
                    fill={
                      isPeak
                        ? 'var(--warning-amber)'
                        : isWeekend
                        ? 'var(--credit-violet)'
                        : 'var(--primary)'
                    }
                    opacity={isHovered ? 1 : 0.85}
                  />
                ) : (
                  <circle
                    cx={x + barWidth / 2}
                    cy={paddingTop + usableHeight - 2}
                    r="1.5"
                    fill="var(--text-muted)"
                    opacity="0.3"
                  />
                )}

                {/* Day number (label every 2-3 days or on hover to prevent overlapping) */}
                {(item.day === 1 ||
                  item.day % 5 === 0 ||
                  item.day === data.length ||
                  isHovered ||
                  isPeak) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    fill={
                      isHovered
                        ? 'var(--text-primary)'
                        : isPeak
                        ? 'var(--warning-amber)'
                        : 'var(--text-muted)'
                    }
                    fontSize="10"
                    fontWeight={isHovered || isPeak ? '700' : '400'}
                    fontFamily="var(--font-mono)"
                  >
                    {item.day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredDay !== null && (
          (() => {
            const item = data.find((d) => d.day === hoveredDay);
            if (!item) return null;
            const xPercent = ((hoveredDay - 0.5) / data.length) * 100;
            const topY =
              paddingTop + usableHeight - (item.totalExpenses / maxVal) * usableHeight;

            return (
              <div
                className="chart-tooltip"
                style={{
                  left: `${Math.min(Math.max(xPercent, 15), 85)}%`,
                  top: `${Math.max(10, topY)}px`,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>
                  Day {item.day} ({item.dayOfWeek}) — {item.date}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: item.totalExpenses > 0 ? 'var(--primary)' : 'var(--text-muted)',
                    marginBottom: '4px',
                  }}
                >
                  {formatCurrency(item.totalExpenses, currencyCode, currencySymbol)}
                </div>
                {item.totalExpenses > 0 && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <span>Cash: {formatCurrency(item.cashSpent, currencyCode, currencySymbol)}</span>
                    <span>Cards: {formatCurrency(item.cardSpent, currencyCode, currencySymbol)}</span>
                    <span>Transactions: {item.transactionCount}</span>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
