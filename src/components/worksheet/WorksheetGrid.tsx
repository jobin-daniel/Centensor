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

  // Generate array of days 1..daysInMonth
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="worksheet-container">
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
            {Object.entries(categoriesByGroup).map(([groupName, rows]) => (
              <React.Fragment key={groupName}>
                {/* Group Divider Row */}
                <tr className="group-header-row">
                  <td colSpan={daysInMonth + 5}>{groupName}</td>
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
            ))}
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
    </div>
  );
}
