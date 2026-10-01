'use client';

import React, { useState } from 'react';
import {
  MonthlyWorksheetData,
  Category,
  MatrixCellData,
  Account,
} from '@/lib/types';
import { getDayOfWeekAbbr, formatCurrency } from '@/lib/formatters';
import CellDetailModal from './CellDetailModal';
import MonthGlHeadsModal from './MonthGlHeadsModal';
import { Plus, Layers, FolderPlus, Sparkles, ArrowUp, ArrowDown, ListOrdered } from 'lucide-react';

interface WorksheetGridProps {
  data: MonthlyWorksheetData;
  accounts: Account[];
  onRefresh: () => void;
}

export default function WorksheetGrid({ data, accounts, onRefresh }: WorksheetGridProps) {
  const { year, month, daysInMonth, book, categoriesByGroup, dailySummaries, monthTotals } = data;
  const currencyCode = book.currency_code;
  const currencySymbol = book.currency_symbol;

  const [activeCellData, setActiveCellData] = useState<{
    category: Category;
    cell: MatrixCellData;
  } | null>(null);

  const [isGlModalOpen, setIsGlModalOpen] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isMovingHead, setIsMovingHead] = useState(false);

  // Generate array of days 1..daysInMonth
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const groupEntries = Object.entries(categoriesByGroup);
  const totalGroups = groupEntries.length;

  const handleQuickAddAll = async () => {
    setIsQuickAdding(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          monthStr,
          action: 'add_all',
        }),
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleMoveHead = async (headId: number, direction: 'up' | 'down') => {
    setIsMovingHead(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          monthStr,
          action: 'move_head',
          headId,
          direction,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMovingHead(false);
    }
  };

  return (
    <div className="worksheet-container">
      {/* Worksheet Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-elevated)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>
                {data.monthName} {year} Worksheet
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                ({book.name} &bull; {currencyCode})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: totalGroups > 0 ? 'var(--primary-subtle)' : 'var(--warning-amber-subtle)',
                color: totalGroups > 0 ? 'var(--primary)' : 'var(--warning-amber)',
              }}
            >
              {totalGroups} {totalGroups === 1 ? 'GL Head' : 'GL Heads'} in use
            </span>

            {data.hasSavedGlPreferences && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                }}
              >
                Saved preference
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsGlModalOpen(true)}
            style={{ fontSize: '12px', padding: '6px 14px', height: '34px' }}
          >
            <ListOrdered size={14} />
            <span>Arrange Heads ({totalGroups})</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsGlModalOpen(true)}
            style={{ fontSize: '12px', padding: '6px 16px', height: '34px', fontWeight: 700 }}
          >
            <Plus size={15} />
            <span>+ Add GL Head</span>
          </button>
        </div>
      </div>

      {/* Empty State when 0 GL heads are active in this month */}
      {totalGroups === 0 ? (
        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary-subtle) 0%, var(--neu-magenta-subtle) 100%)',
              border: '1px solid var(--border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <FolderPlus size={32} />
          </div>

          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              No GL Heads in use for {data.monthName} {year}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
              Each month has its own tailored selection of General Ledger heads that are actually in use for that month.
              Add the GL heads you need for this month to get started.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsGlModalOpen(true)}
              style={{ padding: '8px 22px', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>+ Add GL Heads for {data.monthName}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleQuickAddAll}
              disabled={isQuickAdding}
              style={{ padding: '8px 16px' }}
            >
              <Sparkles size={15} />
              <span>{isQuickAdding ? 'Adding...' : 'Add All Available Heads'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="worksheet-scroll-wrapper">
          <table className="worksheet-table">
            <thead>
              <tr>
                {/* Frozen Category Column Header */}
                <th className="ws-th ws-th-category">GL Category Account</th>

                {/* Day Headers (1 to 31) */}
                {days.map((day) => {
                  const summary = dailySummaries[day];
                  const dayAbbr = getDayOfWeekAbbr(year, month, day);
                  const isWknd = summary?.isWeekend;
                  const isTdy = summary?.isToday;

                  return (
                    <th
                      key={day}
                      className={`ws-th day-header ${isWknd ? 'is-weekend' : ''} ${isTdy ? 'is-today' : ''}`}
                      title={`${dayAbbr}, ${day} ${data.monthName} ${year}`}
                    >
                      <span className="day-number">{day}</span>
                      <span className="day-abbr">{dayAbbr}</span>
                    </th>
                  );
                })}

                {/* Frozen Summary Headers (Right) */}
                <th className="ws-th ws-th-total">Total</th>
                <th className="ws-th ws-th-budget">Budget</th>
                <th className="ws-th ws-th-variance">Variance</th>
                <th className="ws-th" style={{ width: '60px', minWidth: '60px' }}>%</th>
              </tr>
            </thead>

            <tbody>
              {groupEntries.map(([groupName, rows], groupIndex) => {
                const firstRowCat = rows[0]?.category;
                const headId = firstRowCat?.head_id;
                const headIcon = firstRowCat?.head_icon;
                const isFirst = groupIndex === 0;
                const isLast = groupIndex === groupEntries.length - 1;

                return (
                  <React.Fragment key={groupName}>
                    {/* Group Divider Row with Reorder Controls */}
                    <tr className="group-header-row">
                      <td colSpan={daysInMonth + 5}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {headIcon && <span>{headIcon}</span>}
                            <span>{groupName}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              ({rows.length} {rows.length === 1 ? 'account' : 'accounts'})
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {headId && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--primary)',
                                    fontWeight: 700,
                                    marginRight: '6px',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                  title={`Position #${groupIndex + 1}`}
                                >
                                  #{groupIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={isFirst || isMovingHead}
                                  onClick={() => handleMoveHead(headId, 'up')}
                                  title={`Move "${groupName}" up`}
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: isFirst ? 'not-allowed' : 'pointer',
                                    opacity: isFirst ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isMovingHead}
                                  onClick={() => handleMoveHead(headId, 'down')}
                                  title={`Move "${groupName}" down`}
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: isLast ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: isLast ? 'not-allowed' : 'pointer',
                                    opacity: isLast ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Category Rows */}
                    {rows.map((row) => {
                      const cat = row.category;
                      const variance = row.budget > 0 ? row.variance : 0;
                      const isOver = row.budget > 0 && row.monthTotal > row.budget;

                      return (
                        <tr key={cat.id} className="ws-data-row">
                          {/* Frozen Category Name */}
                          <td className="ws-td-category">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: cat.color || 'var(--primary)',
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cat.name}>
                                {cat.name}
                              </span>
                            </div>
                          </td>

                          {/* Day Cells 1..daysInMonth */}
                          {days.map((day) => {
                            const cell = row.cells[day];
                            const hasVal = cell && cell.totalAmount > 0;

                            return (
                              <td
                                key={day}
                                onClick={() => setActiveCellData({ category: cat, cell })}
                                title={hasVal ? `${cat.name} on Day ${day}: ${formatCurrency(cell.totalAmount, currencyCode, currencySymbol)}` : `Add ${cat.name} on Day ${day}`}
                              >
                                <div className={`ws-cell ${hasVal ? 'has-value' : 'empty'}`}>
                                  {hasVal ? (
                                    <>
                                      <span className="tabular-nums">
                                        {cell.totalAmount >= 1000 ? Math.round(cell.totalAmount).toLocaleString() : cell.totalAmount}
                                      </span>
                                      <div className="payment-dots">
                                        {cell.hasCash && <div className="dot dot-cash" title="Cash" />}
                                        {cell.hasDebit && <div className="dot dot-debit" title="Debit / Bank" />}
                                        {cell.hasCredit && <div className="dot dot-credit" title="Credit Card" />}
                                      </div>
                                    </>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Month Total for Category */}
                          <td className="ws-td-total tabular-nums" style={{ fontWeight: 700 }}>
                            {row.monthTotal > 0 ? formatCurrency(row.monthTotal, currencyCode, currencySymbol) : '-'}
                          </td>

                          {/* Monthly Budget */}
                          <td className="ws-td-budget tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                            {row.budget > 0 ? formatCurrency(row.budget, currencyCode, currencySymbol) : '-'}
                          </td>

                          {/* Budget Variance */}
                          <td
                            className="ws-td-variance tabular-nums"
                            style={{
                              fontWeight: 700,
                              color: row.budget > 0 ? (isOver ? 'var(--danger-rose)' : 'var(--cash-green)') : 'var(--text-muted)',
                            }}
                          >
                            {row.budget > 0 ? (
                              <span>{isOver ? `-${formatCurrency(Math.abs(variance), currencyCode, currencySymbol)}` : `+${formatCurrency(variance, currencyCode, currencySymbol)}`}</span>
                            ) : (
                              '-'
                            )}
                          </td>

                          {/* Percent of Month Total */}
                          <td className="tabular-nums" style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)' }}>
                            {row.percentOfTotal > 0 ? `${row.percentOfTotal.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Bottom Add GL Head Row */}
              <tr className="ws-data-row ws-add-head-row">
                <td
                  colSpan={daysInMonth + 5}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderTop: '1px dashed var(--border-strong)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsGlModalOpen(true)}
                    className="btn btn-secondary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                    }}
                  >
                    <Plus size={13} />
                    <span>+ Add another GL Head to {data.monthName}</span>
                  </button>
                </td>
              </tr>
            </tbody>

            {/* Table Summary Footer Rows */}
            <tfoot>
              {/* 1. Daily Cash Expenses */}
              <tr className="ws-footer-row row-cash">
                <td className="ws-td-category ws-footer-label" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--cash-green)' }}>
                  Daily Cash Spent
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.cashSpent > 0 ? Math.round(dailySummaries[day].cashSpent).toLocaleString() : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">{formatCurrency(monthTotals.totalCashSpent, currencyCode, currencySymbol)}</td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 2. Daily Cards / Bank Spent */}
              <tr className="ws-footer-row row-card">
                <td className="ws-td-category ws-footer-label" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--card-blue)' }}>
                  Daily Cards Spent
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.cardSpent > 0 ? Math.round(dailySummaries[day].cardSpent).toLocaleString() : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">{formatCurrency(monthTotals.totalCardSpent, currencyCode, currencySymbol)}</td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 3. Daily Grand Total Expenses */}
              <tr className="ws-footer-row row-grand-total">
                <td className="ws-td-category ws-footer-label" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>
                  Daily Total Expenses
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums" style={{ fontWeight: 800 }}>
                    {dailySummaries[day]?.grandTotal > 0 ? Math.round(dailySummaries[day].grandTotal).toLocaleString() : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(monthTotals.totalExpenses, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget tabular-nums">{monthTotals.totalBudget > 0 ? formatCurrency(monthTotals.totalBudget, currencyCode, currencySymbol) : '-'}</td>
                <td className="ws-td-variance tabular-nums">
                  {monthTotals.totalBudget > 0 ? formatCurrency(monthTotals.totalBudget - monthTotals.totalExpenses, currencyCode, currencySymbol) : '-'}
                </td>
                <td>100%</td>
              </tr>

              {/* 4. Daily Bank Withdrawals into Cash */}
              <tr className="ws-footer-row row-withdrawal">
                <td className="ws-td-category ws-footer-label" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--warning-amber)' }}>
                  Bank Withdrawals (Cash IN)
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.bankWithdrawal > 0 ? Math.round(dailySummaries[day].bankWithdrawal).toLocaleString() : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">{formatCurrency(monthTotals.totalWithdrawals, currencyCode, currencySymbol)}</td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 5. End-of-Day (EOD) Cash in Hand */}
              <tr className="ws-footer-row row-eod-cash">
                <td className="ws-td-category ws-footer-label" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--primary)' }}>
                  EOD Cash in Hand
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums" style={{ fontWeight: 700 }}>
                    {Math.round(dailySummaries[day]?.eodCashComputed || 0).toLocaleString()}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums" style={{ fontWeight: 800 }}>
                  {formatCurrency(monthTotals.endingCash, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Cell Detail Modal Drawer */}
      {activeCellData && (
        <CellDetailModal
          category={activeCellData.category}
          cell={activeCellData.cell}
          bookId={book.id}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          accounts={accounts}
          onClose={() => setActiveCellData(null)}
          onRefresh={() => {
            setActiveCellData(null);
            onRefresh();
          }}
        />
      )}

      {/* Monthly GL Heads Selection & Rearrangement Modal */}
      {isGlModalOpen && (
        <MonthGlHeadsModal
          bookId={book.id}
          bookName={book.name}
          year={year}
          month={month}
          monthName={data.monthName}
          onClose={() => setIsGlModalOpen(false)}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
