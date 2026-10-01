'use client';

import React, { useState } from 'react';
import { MonthlyTrendItem, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
  currencyCode: CurrencyCode;
  currencySymbol?: string;
  selectedMonth: number;
  onSelectMonth?: (month: number) => void;
}

export default function MonthlyTrendChart({
  data,
  currencyCode,
  currencySymbol,
  selectedMonth,
  onSelectMonth,
}: MonthlyTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(...data.map((d) => d.totalExpenses), 1);
  const nonZeroMonths = data.filter((d) => d.totalExpenses > 0);
  const avgExpense =
    nonZeroMonths.length > 0
      ? nonZeroMonths.reduce((sum, d) => sum + d.totalExpenses, 0) / nonZeroMonths.length
      : 0;

  const chartHeight = 180;
  const paddingBottom = 26;
  const paddingTop = 20;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const avgY = paddingTop + usableHeight - (avgExpense / maxVal) * usableHeight;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend & Sub-header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--cash-green)' }} />
            <span>Cash in Hand</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--credit-violet)' }} />
            <span>Cards & Digital</span>
          </div>
        </div>

        {avgExpense > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Active Mo. Avg:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(avgExpense, currencyCode, currencySymbol)}
            </strong>
          </span>
        )}
      </div>

      {/* SVG Chart Container */}
      <div style={{ position: 'relative', height: `${chartHeight}px`, width: '100%' }}>
        <svg
          viewBox={`0 0 1000 ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="barGradientCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="barGradientCard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
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

          {/* Average Reference Line */}
          {avgExpense > 0 && (
            <g>
              <line
                x1="0"
                y1={avgY}
                x2="1000"
                y2={avgY}
                stroke="var(--warning-amber)"
                strokeDasharray="4 4"
                strokeWidth="1.2"
                opacity="0.8"
              />
            </g>
          )}

          {/* Bars for 12 months */}
          {data.map((item, idx) => {
            const barWidth = 54;
            const slotWidth = 1000 / data.length;
            const x = idx * slotWidth + (slotWidth - barWidth) / 2;

            const totalH = (item.totalExpenses / maxVal) * usableHeight;
            const cardH = (item.cardSpent / maxVal) * usableHeight;
            const cashH = (item.cashSpent / maxVal) * usableHeight;

            const isSelected = item.month === selectedMonth;
            const isHovered = hoveredIdx === idx;

            const cardY = paddingTop + usableHeight - totalH;
            const cashY = paddingTop + usableHeight - cashH;

            return (
              <g
                key={item.month}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectMonth && onSelectMonth(item.month)}
              >
                {/* Background column highlight on hover / selected */}
                {(isHovered || isSelected) && (
                  <rect
                    x={idx * slotWidth + 4}
                    y={paddingTop}
                    width={slotWidth - 8}
                    height={usableHeight}
                    fill={isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)'}
                    rx="4"
                  />
                )}

                {totalH > 0 ? (
                  <>
                    {/* Card spent bar top segment */}
                    {cardH > 0 && (
                      <rect
                        x={x}
                        y={cardY}
                        width={barWidth}
                        height={cardH}
                        rx={cashH > 0 ? 0 : 4}
                        fill="url(#barGradientCard)"
                        opacity={isHovered ? 1 : isSelected ? 0.95 : 0.8}
                      />
                    )}

                    {/* Cash spent bar bottom segment */}
                    {cashH > 0 && (
                      <rect
                        x={x}
                        y={cashY}
                        width={barWidth}
                        height={cashH}
                        rx="4"
                        fill="url(#barGradientCash)"
                        opacity={isHovered ? 1 : isSelected ? 0.95 : 0.8}
                      />
                    )}
                  </>
                ) : (
                  // Empty month zero marker
                  <circle
                    cx={x + barWidth / 2}
                    cy={paddingTop + usableHeight - 2}
                    r="2.5"
                    fill="var(--text-muted)"
                    opacity="0.4"
                  />
                )}

                {/* Selected month indicator marker */}
                {isSelected && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={chartHeight - 4}
                    r="3"
                    fill="var(--primary)"
                  />
                )}

                {/* Month label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fill={isSelected ? 'var(--primary)' : isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontSize="12"
                  fontWeight={isSelected || isHovered ? '700' : '500'}
                  fontFamily="var(--font-sans)"
                >
                  {item.monthStr}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            className="chart-tooltip"
            style={{
              left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
              top: `${Math.max(
                20,
                paddingTop +
                  usableHeight -
                  (data[hoveredIdx].totalExpenses / maxVal) * usableHeight
              )}px`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
              {data[hoveredIdx].monthStr} Expenses
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--primary)',
                marginBottom: '4px',
              }}
            >
              {formatCurrency(data[hoveredIdx].totalExpenses, currencyCode, currencySymbol)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span>
                💵 Cash: {formatCurrency(data[hoveredIdx].cashSpent, currencyCode, currencySymbol)}
              </span>
              <span>
                💳 Cards: {formatCurrency(data[hoveredIdx].cardSpent, currencyCode, currencySymbol)}
              </span>
              <span>
                📝 Transactions: {data[hoveredIdx].transactionCount}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Click to view details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
