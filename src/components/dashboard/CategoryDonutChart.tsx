'use client';

import React, { useState } from 'react';
import { CategoryExpenseBreakdown, CurrencyCode } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

interface CategoryDonutChartProps {
  categories: CategoryExpenseBreakdown[];
  totalExpenses: number;
  currencyCode: CurrencyCode;
  currencySymbol?: string;
}

export default function CategoryDonutChart({
  categories,
  totalExpenses,
  currencyCode,
  currencySymbol,
}: CategoryDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!categories || categories.length === 0 || totalExpenses === 0) {
    return (
      <div
        style={{
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        No expense category data for this period.
      </div>
    );
  }

  // Aggregate top 7 categories and bundle remaining as "Other"
  const topLimit = 7;
  const displayItems: { name: string; amount: number; percent: number; color: string }[] = [];
  const topSlice = categories.slice(0, topLimit);

  topSlice.forEach((c) => {
    displayItems.push({
      name: c.categoryName,
      amount: c.totalAmount,
      percent: c.percentOfTotal,
      color: c.color || '#6366f1',
    });
  });

  if (categories.length > topLimit) {
    const otherAmount = categories
      .slice(topLimit)
      .reduce((sum, c) => sum + c.totalAmount, 0);
    const otherPct = (otherAmount / totalExpenses) * 100;
    if (otherAmount > 0) {
      displayItems.push({
        name: `Other (${categories.length - topLimit})`,
        amount: otherAmount,
        percent: otherPct,
        color: '#64748b',
      });
    }
  }

  // Compute SVG arc angles
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = displayItems.map((item, idx) => {
    const fraction = item.percent / 100;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset * circumference;
    cumulativeOffset += fraction;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeItem = hoveredIdx !== null ? displayItems[hoveredIdx] : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '24px',
        flexWrap: 'wrap',
        padding: '8px 0',
      }}
    >
      {/* Donut Graphic */}
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg) => {
            const isHovered = hoveredIdx === seg.idx;
            return (
              <circle
                key={seg.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                }}
                onMouseEnter={() => setHoveredIdx(seg.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text Hole */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: activeItem ? activeItem.color : 'var(--text-muted)',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeItem ? activeItem.name : 'Total Outflow'}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: activeItem ? '16px' : '15px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginTop: '2px',
            }}
          >
            {formatCurrency(
              activeItem ? activeItem.amount : totalExpenses,
              currencyCode,
              currencySymbol
            )}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeItem ? `${activeItem.percent.toFixed(1)}%` : `${categories.length} categories`}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div
        style={{
          flex: 1,
          minWidth: '220px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
      >
        {displayItems.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.name}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: isHovered ? 'var(--bg-surface-elevated)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: isHovered ? 700 : 500,
                    color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>
                  {formatCurrency(item.amount, currencyCode, currencySymbol)}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    minWidth: '36px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {item.percent.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
