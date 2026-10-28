'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MonthlyWorksheetData,
  Category,
  MatrixCellData,
  Account,
  WorksheetGroupSection,
} from '@/lib/types';
import { getDayOfWeekAbbr, formatCurrency } from '@/lib/formatters';
import CellDetailModal from './CellDetailModal';
import MonthGlHeadsModal from './MonthGlHeadsModal';
import {
  Plus,
  Layers,
  FolderPlus,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
} from 'lucide-react';

interface WorksheetGridProps {
  data: MonthlyWorksheetData;
  accounts: Account[];
  categories?: Category[];
  onRefresh: () => void;
}

export default function WorksheetGrid({ data, accounts, categories, onRefresh }: WorksheetGridProps) {
  const { year, month, daysInMonth, book, categoriesByGroup, dailySummaries, monthTotals } = data;
  const currencyCode = book.currency_code;
  const currencySymbol = book.currency_symbol;

  const [activeCellData, setActiveCellData] = useState<{
    category: Category;
    cell: MatrixCellData;
  } | null>(null);

  // Scroll and cell location persistence
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveCellRef = useRef<{ categoryId: number; day: number } | null>(null);
  const savedScrollRef = useRef<{ scrollLeft: number; scrollTop: number; windowY: number } | null>(null);
  const [highlightedCellKey, setHighlightedCellKey] = useState<string | null>(null);

  // Collect all available categories for editing / selection
  const allCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const list: Category[] = [];
    const seen = new Set<number>();
    if (categoriesByGroup) {
      Object.values(categoriesByGroup).forEach((rows) => {
        rows.forEach((r) => {
          if (r.category && !seen.has(r.category.id)) {
            seen.add(r.category.id);
            list.push(r.category);
          }
        });
      });
    }
    return list;
  }, [categories, categoriesByGroup]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      savedScrollRef.current = {
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
        windowY: window.scrollY,
      };
    }
  };

  const handleCellClick = (cat: Category, cell: MatrixCellData, day: number) => {
    lastActiveCellRef.current = { categoryId: cat.id, day };
    if (scrollContainerRef.current) {
      savedScrollRef.current = {
        scrollLeft: scrollContainerRef.current.scrollLeft,
        scrollTop: scrollContainerRef.current.scrollTop,
        windowY: window.scrollY,
      };
      try {
        sessionStorage.setItem(
          `centensor_ws_active_cell_${book.id}`,
          JSON.stringify({
            categoryId: cat.id,
            day,
            scrollLeft: scrollContainerRef.current.scrollLeft,
            scrollTop: scrollContainerRef.current.scrollTop,
            windowY: window.scrollY,
            year,
            month,
          })
        );
      } catch (e) {}
    }
    setActiveCellData({ category: cat, cell });
  };

  // Initial mount: restore last active cell/scroll or scroll to today
  useEffect(() => {
    let restored = false;
    try {
      const stored = sessionStorage.getItem(`centensor_ws_active_cell_${book.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.year === year && parsed.month === month && scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = parsed.scrollLeft;
          scrollContainerRef.current.scrollTop = parsed.scrollTop;
          savedScrollRef.current = {
            scrollLeft: parsed.scrollLeft,
            scrollTop: parsed.scrollTop,
            windowY: parsed.windowY || 0,
          };
          if (parsed.categoryId && parsed.day) {
            lastActiveCellRef.current = { categoryId: parsed.categoryId, day: parsed.day };
          }
          restored = true;
        }
      }
    } catch (e) {}

    // If no stored scroll position, check if today is in this month and scroll today into view
    if (!restored) {
      const todayEntry = Object.entries(dailySummaries).find(([_, s]) => s?.isToday);
      if (todayEntry && scrollContainerRef.current) {
        const todayDay = parseInt(todayEntry[0], 10);
        const targetScroll = Math.max(0, (todayDay - 3) * 60);
        scrollContainerRef.current.scrollLeft = targetScroll;
        savedScrollRef.current = {
          scrollLeft: targetScroll,
          scrollTop: 0,
          windowY: window.scrollY,
        };
      }
    }
  }, [book.id, year, month]);

  // When data updates (after an expense is added, edited, or deleted), restore cell location and scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      let scrollInfo = savedScrollRef.current;
      if (!scrollInfo) {
        try {
          const stored = sessionStorage.getItem(`centensor_ws_active_cell_${book.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.year === year && parsed.month === month) {
              scrollInfo = {
                scrollLeft: parsed.scrollLeft,
                scrollTop: parsed.scrollTop,
                windowY: parsed.windowY || 0,
              };
              if (!lastActiveCellRef.current && parsed.categoryId && parsed.day) {
                lastActiveCellRef.current = { categoryId: parsed.categoryId, day: parsed.day };
              }
            }
          }
        } catch (e) {}
      }

      if (scrollInfo && scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollInfo.scrollLeft;
        scrollContainerRef.current.scrollTop = scrollInfo.scrollTop;
        if (typeof scrollInfo.windowY === 'number') {
          window.scrollTo({ top: scrollInfo.windowY });
        }
      }

      if (lastActiveCellRef.current) {
        const { categoryId, day } = lastActiveCellRef.current;
        const cellKey = `${categoryId}-${day}`;
        setHighlightedCellKey(cellKey);

        const highlightTimer = setTimeout(() => {
          setHighlightedCellKey((curr) => (curr === cellKey ? null : curr));
        }, 2500);

        const cellEl = document.getElementById(`ws-cell-${cellKey}`);
        if (cellEl && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const cellRect = cellEl.getBoundingClientRect();

          if (cellRect.left < containerRect.left || cellRect.right > containerRect.right) {
            cellEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          }
        }

        return () => clearTimeout(highlightTimer);
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [data]);

  const [isGlModalOpen, setIsGlModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'select' | 'reorder'>('select');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [isMovingHead, setIsMovingHead] = useState(false);
  const [isRemovingHead, setIsRemovingHead] = useState<string | null>(null);

  // Inline Budget Editing on Worksheet
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState<boolean>(false);

  const handleSaveCategoryBudget = async (categoryId: number, valueStr: string) => {
    const num = Math.max(0, parseFloat(valueStr) || 0);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    setIsSavingBudget(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_single',
          bookId: book.id,
          month: monthStr,
          categoryId,
          amount: num,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingBudgetId(null);
        onRefresh();
      }
    } catch (e) {
      console.error('Error saving category budget in worksheet:', e);
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Collapsed GL Heads state (set of group names)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group sections (supports drag-and-drop & optimistic reordering)
  const initialSections: WorksheetGroupSection[] = useMemo(() => {
    if (data.groups && data.groups.length > 0) {
      return data.groups;
    }
    return Object.entries(categoriesByGroup).map(([groupName, rows]) => {
      const firstRowCat = rows[0]?.category;
      return {
        headId: firstRowCat?.head_id || undefined,
        name: groupName,
        icon: firstRowCat?.head_icon || undefined,
        color: firstRowCat?.color || undefined,
        rows,
      };
    });
  }, [data.groups, categoriesByGroup]);

  const [sections, setSections] = useState<WorksheetGroupSection[]>(initialSections);

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  // Drag-and-drop state on worksheet table
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null);

  // Generate array of days 1..daysInMonth
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalGroups = sections.length;

  const allCollapsed = totalGroups > 0 && sections.every((s) => collapsedGroups.has(s.name));

  const toggleCollapseGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedGroups(new Set());
    } else {
      setCollapsedGroups(new Set(sections.map((s) => s.name)));
    }
  };

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

  // Remove GL Head if no transactions exist for this month
  const handleRemoveHead = async (section: WorksheetGroupSection, e: React.MouseEvent) => {
    e.stopPropagation();
    const groupName = section.name;

    if (!window.confirm(`Remove GL Head "${groupName}" from ${data.monthName} ${year}?`)) {
      return;
    }

    setIsRemovingHead(groupName);
    // Optimistically remove from view
    setSections((prev) => prev.filter((s) => s.name !== groupName));

    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          monthStr,
          action: 'remove_head',
          headId: section.headId,
          headName: section.name,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      } else {
        alert(json.error || 'Failed to remove GL head');
        onRefresh();
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred while removing the GL head');
      onRefresh();
    } finally {
      setIsRemovingHead(null);
    }
  };

  // Reorder single head via Move Up / Move Down
  const handleMoveHead = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    // Optimistically update local sections
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setSections(reordered);

    setIsMovingHead(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const headId = sections[index].headId;

      if (headId) {
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
      } else {
        // Full reorder array fallback
        const headIds = reordered.map((s) => s.headId).filter(Boolean) as number[];
        const res = await fetch('/api/worksheet/gl-heads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            monthStr,
            action: 'reorder',
            headIds,
          }),
        });
        const json = await res.json();
        if (json.success) {
          onRefresh();
        }
      }
    } catch (e) {
      console.error(e);
      onRefresh();
    } finally {
      setIsMovingHead(false);
    }
  };

  // Table Drag and Drop Handlers
  const handleTableDragStart = (e: React.DragEvent, index: number) => {
    setDraggedGroupIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTableDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGroupIndex !== index) {
      setDragOverGroupIndex(index);
    }
  };

  const handleTableDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedGroupIndex === null || draggedGroupIndex === targetIndex) {
      setDraggedGroupIndex(null);
      setDragOverGroupIndex(null);
      return;
    }

    const reordered = [...sections];
    const [removed] = reordered.splice(draggedGroupIndex, 1);
    reordered.splice(targetIndex, 0, removed);
    setSections(reordered);

    setDraggedGroupIndex(null);
    setDragOverGroupIndex(null);

    // Persist new order
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const headIds = reordered.map((s) => s.headId).filter(Boolean) as number[];
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          monthStr,
          action: 'reorder',
          headIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
      onRefresh();
    }
  };

  const openModal = (tab: 'select' | 'reorder') => {
    setModalInitialTab(tab);
    setIsGlModalOpen(true);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {totalGroups > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleCollapseAll}
              style={{ fontSize: '12px', padding: '6px 12px', height: '34px' }}
              title={allCollapsed ? 'Expand all GL heads' : 'Collapse all GL heads to summary rows'}
            >
              {allCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
              <span>{allCollapsed ? 'Expand All' : 'Collapse All'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openModal('reorder')}
            style={{ fontSize: '12px', padding: '6px 14px', height: '34px' }}
            title="Rearrange the display order of GL heads"
          >
            <ListOrdered size={14} />
            <span>Arrange Heads ({totalGroups})</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openModal('select')}
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
              onClick={() => openModal('select')}
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
        <div className="worksheet-scroll-wrapper" ref={scrollContainerRef} onScroll={handleScroll}>
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
              {sections.map((section, groupIndex) => {
                const groupName = section.name;
                const rows = section.rows;
                const headIcon = section.icon;
                const isFirst = groupIndex === 0;
                const isLast = groupIndex === sections.length - 1;
                const isDragging = draggedGroupIndex === groupIndex;
                const isDragOver = dragOverGroupIndex === groupIndex;
                const isCollapsed = collapsedGroups.has(groupName);

                // Group aggregates
                const headMonthTotal = rows.reduce((sum, r) => sum + (r.monthTotal || 0), 0);
                const headBudget = rows.reduce((sum, r) => sum + (r.budget || 0), 0);
                const headVariance = headBudget > 0 ? headBudget - headMonthTotal : 0;
                const isHeadOver = headBudget > 0 && headMonthTotal > headBudget;
                const headPercent =
                  monthTotals.totalExpenses > 0 ? (headMonthTotal / monthTotals.totalExpenses) * 100 : 0;

                // Check if any transaction/value exists for this GL head in this month
                const hasTransactions =
                  headMonthTotal > 0 ||
                  rows.some((r) =>
                    Object.values(r.cells).some((c) => (c.transactionCount || 0) > 0 || c.totalAmount > 0)
                  );

                return (
                  <React.Fragment key={groupName}>
                    {isCollapsed ? (
                      /* Collapsed Head Summary Row (Read-only summary across all columns) */
                      <tr
                        className="ws-data-row ws-collapsed-head-row"
                        draggable
                        onDragStart={(e) => handleTableDragStart(e, groupIndex)}
                        onDragOver={(e) => handleTableDragOver(e, groupIndex)}
                        onDrop={(e) => handleTableDrop(e, groupIndex)}
                        style={{
                          backgroundColor: isDragging
                            ? 'var(--primary-subtle)'
                            : isDragOver
                            ? 'var(--bg-surface-hover)'
                            : 'var(--bg-surface-elevated)',
                          outline: isDragOver ? '2px dashed var(--primary)' : 'none',
                          cursor: 'grab',
                          transition: 'all 0.15s ease',
                          opacity: isDragging ? 0.4 : 1,
                          borderBottom: '2px solid var(--border-strong)',
                        }}
                      >
                        {/* Frozen Category Cell with Expand & Controls */}
                        <td className="ws-td-category" style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              {/* Collapse/Expand Toggle Button */}
                              <button
                                type="button"
                                onClick={() => toggleCollapseGroup(groupName)}
                                title="Click to expand GL head categories"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <ChevronRight size={16} />
                              </button>

                              {/* Drag Handle */}
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                  cursor: 'grab',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Drag to rearrange GL head order"
                              >
                                <GripVertical size={14} />
                              </span>

                              {headIcon && <span style={{ fontSize: '13px' }}>{headIcon}</span>}
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`${groupName} (Collapsed summary)`}
                              >
                                {groupName}
                              </span>

                              <span
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--text-muted)',
                                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  flexShrink: 0,
                                }}
                              >
                                {rows.length} {rows.length === 1 ? 'cat' : 'cats'}
                              </span>
                            </div>

                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Position & Move Up/Down Controls */}
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '1px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '9px',
                                    color: 'var(--primary)',
                                    fontWeight: 700,
                                    marginRight: '2px',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                  title={`Position #${groupIndex + 1}`}
                                >
                                  #{groupIndex + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={isFirst || isMovingHead}
                                  onClick={() => handleMoveHead(groupIndex, 'up')}
                                  title={`Move "${groupName}" up`}
                                  style={{
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: isFirst ? 'not-allowed' : 'pointer',
                                    opacity: isFirst ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isMovingHead}
                                  onClick={() => handleMoveHead(groupIndex, 'down')}
                                  title={`Move "${groupName}" down`}
                                  style={{
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: isLast ? 'var(--text-muted)' : 'var(--text-primary)',
                                    cursor: isLast ? 'not-allowed' : 'pointer',
                                    opacity: isLast ? 0.3 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ArrowDown size={11} />
                                </button>
                              </div>

                              {/* Head Removal Button if no transactions added */}
                              {!hasTransactions && (
                                <button
                                  type="button"
                                  disabled={isRemovingHead === groupName}
                                  onClick={(e) => handleRemoveHead(section, e)}
                                  title={`Remove GL head "${groupName}" from this month (no transactions recorded)`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: 'var(--danger-rose)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Read-Only Summary Daily Cells for Collapsed Head */}
                        {days.map((day) => {
                          const daySum = rows.reduce((s, r) => s + (r.cells[day]?.totalAmount || 0), 0);
                          const dayHasCash = rows.some((r) => r.cells[day]?.hasCash);
                          const dayHasDebit = rows.some((r) => r.cells[day]?.hasDebit);
                          const dayHasCredit = rows.some((r) => r.cells[day]?.hasCredit);

                          return (
                            <td
                              key={day}
                              title={
                                daySum > 0
                                  ? `${groupName} summary on Day ${day}: ${formatCurrency(daySum, currencyCode, currencySymbol)} (Click arrow to expand)`
                                  : undefined
                              }
                              style={{ background: 'var(--bg-surface-elevated)' }}
                            >
                              <div
                                className={`ws-cell ${daySum > 0 ? 'has-value' : 'empty'}`}
                                style={{ cursor: 'default' }}
                              >
                                {daySum > 0 ? (
                                  <>
                                    <span className="tabular-nums" style={{ fontWeight: 700 }}>
                                      {daySum >= 1000 ? Math.round(daySum).toLocaleString() : daySum}
                                    </span>
                                    <div className="payment-dots">
                                      {dayHasCash && <div className="dot dot-cash" title="Cash" />}
                                      {dayHasDebit && <div className="dot dot-debit" title="Debit / Bank" />}
                                      {dayHasCredit && <div className="dot dot-credit" title="Credit Card" />}
                                    </div>
                                  </>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Collapsed Total */}
                        <td
                          className="ws-td-total tabular-nums"
                          style={{ fontWeight: 800, background: 'var(--bg-surface-elevated)' }}
                        >
                          {headMonthTotal > 0 ? formatCurrency(headMonthTotal, currencyCode, currencySymbol) : '-'}
                        </td>

                        {/* Collapsed Budget */}
                        <td
                          className="ws-td-budget tabular-nums"
                          style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)' }}
                        >
                          {headBudget > 0 ? formatCurrency(headBudget, currencyCode, currencySymbol) : '-'}
                        </td>

                        {/* Collapsed Variance */}
                        <td
                          className="ws-td-variance tabular-nums"
                          style={{
                            fontWeight: 700,
                            background: 'var(--bg-surface-elevated)',
                            color:
                              headBudget > 0
                                ? isHeadOver
                                  ? 'var(--danger-rose)'
                                  : 'var(--cash-green)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {headBudget > 0 ? (
                            <span>
                              {isHeadOver
                                ? `-${formatCurrency(Math.abs(headVariance), currencyCode, currencySymbol)}`
                                : `+${formatCurrency(headVariance, currencyCode, currencySymbol)}`}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Collapsed % */}
                        <td
                          className="tabular-nums"
                          style={{
                            textAlign: 'right',
                            padding: '6px 8px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-surface-elevated)',
                          }}
                        >
                          {headPercent > 0 ? `${headPercent.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ) : (
                      /* Expanded Head Section: Header Divider Row + Subcategory Rows */
                      <>
                        <tr
                          className="group-header-row"
                          draggable
                          onDragStart={(e) => handleTableDragStart(e, groupIndex)}
                          onDragOver={(e) => handleTableDragOver(e, groupIndex)}
                          onDrop={(e) => handleTableDrop(e, groupIndex)}
                          style={{
                            backgroundColor: isDragging
                              ? 'var(--primary-subtle)'
                              : isDragOver
                              ? 'var(--bg-surface-hover)'
                              : undefined,
                            outline: isDragOver ? '2px dashed var(--primary)' : 'none',
                            cursor: 'grab',
                            transition: 'all 0.15s ease',
                            opacity: isDragging ? 0.4 : 1,
                          }}
                        >
                          <td colSpan={daysInMonth + 5}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Collapse Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => toggleCollapseGroup(groupName)}
                                  title="Click to collapse GL head into summary row"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <ChevronDown size={16} />
                                </button>

                                {/* Drag Handle */}
                                <span
                                  style={{
                                    color: 'var(--text-muted)',
                                    cursor: 'grab',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                  title="Drag to rearrange GL head order"
                                >
                                  <GripVertical size={16} />
                                </span>

                                {headIcon && <span>{headIcon}</span>}
                                <span>{groupName}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  ({rows.length} {rows.length === 1 ? 'account' : 'accounts'})
                                </span>

                                {headMonthTotal > 0 && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '1px 8px',
                                      borderRadius: '999px',
                                      backgroundColor: 'var(--primary-subtle)',
                                      color: 'var(--primary)',
                                      marginLeft: '6px',
                                    }}
                                  >
                                    Total: {formatCurrency(headMonthTotal, currencyCode, currencySymbol)}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                    onClick={() => handleMoveHead(groupIndex, 'up')}
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
                                    onClick={() => handleMoveHead(groupIndex, 'down')}
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

                                {/* Head Removal Button if no transactions added */}
                                {!hasTransactions && (
                                  <button
                                    type="button"
                                    disabled={isRemovingHead === groupName}
                                    onClick={(e) => handleRemoveHead(section, e)}
                                    title={`Remove GL head "${groupName}" from this month (no transactions recorded)`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: 'rgba(239, 68, 68, 0.1)',
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      color: 'var(--danger-rose)',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <Trash2 size={12} />
                                    <span>Remove</span>
                                  </button>
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
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={cat.name}
                                  >
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
                                    id={`ws-cell-${cat.id}-${day}`}
                                    onClick={() => handleCellClick(cat, cell, day)}
                                    title={
                                      hasVal
                                        ? `${cat.name} on Day ${day}: ${formatCurrency(
                                            cell.totalAmount,
                                            currencyCode,
                                            currencySymbol
                                          )}`
                                        : `Add ${cat.name} on Day ${day}`
                                    }
                                  >
                                    <div
                                      className={`ws-cell ${hasVal ? 'has-value' : 'empty'} ${
                                        highlightedCellKey === `${cat.id}-${day}` ? 'just-saved' : ''
                                      }`}
                                    >
                                      {hasVal ? (
                                        <>
                                          <span className="tabular-nums">
                                            {cell.totalAmount >= 1000
                                              ? Math.round(cell.totalAmount).toLocaleString()
                                              : cell.totalAmount}
                                          </span>
                                          <div className="payment-dots">
                                            {cell.hasCash && <div className="dot dot-cash" title="Cash" />}
                                            {cell.hasDebit && <div className="dot dot-debit" title="Debit / Bank" />}
                                            {cell.hasCredit && (
                                              <div className="dot dot-credit" title="Credit Card" />
                                            )}
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
                                {row.monthTotal > 0
                                  ? formatCurrency(row.monthTotal, currencyCode, currencySymbol)
                                  : '-'}
                              </td>

                              {/* Monthly Budget - Interactive inline editable */}
                              <td
                                className="ws-td-budget tabular-nums"
                                style={{
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                }}
                                title="Click to edit category budget"
                                onClick={() => {
                                  if (editingBudgetId !== cat.id) {
                                    setEditingBudgetId(cat.id);
                                    setEditingBudgetValue(row.budget > 0 ? String(row.budget) : '');
                                  }
                                }}
                              >
                                {editingBudgetId === cat.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="number"
                                      step="1"
                                      min="0"
                                      placeholder="0"
                                      className="form-input"
                                      value={editingBudgetValue}
                                      onChange={(e) => setEditingBudgetValue(e.target.value)}
                                      onBlur={(e) => handleSaveCategoryBudget(cat.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        } else if (e.key === 'Escape') {
                                          setEditingBudgetId(null);
                                        }
                                      }}
                                      autoFocus
                                      style={{
                                        width: '80px',
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        height: '24px',
                                        fontFamily: 'var(--font-mono)',
                                      }}
                                    />
                                    {isSavingBudget && <RefreshCw size={10} className="spin" />}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <span>{row.budget > 0 ? formatCurrency(row.budget, currencyCode, currencySymbol) : '-'}</span>
                                    <Edit2 size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
                                  </div>
                                )}
                              </td>

                              {/* Budget Variance */}
                              <td
                                className="ws-td-variance tabular-nums"
                                style={{
                                  fontWeight: 700,
                                  color:
                                    row.budget > 0
                                      ? isOver
                                        ? 'var(--danger-rose)'
                                        : 'var(--cash-green)'
                                      : 'var(--text-muted)',
                                }}
                              >
                                {row.budget > 0 ? (
                                  <span>
                                    {isOver
                                      ? `-${formatCurrency(Math.abs(variance), currencyCode, currencySymbol)}`
                                      : `+${formatCurrency(variance, currencyCode, currencySymbol)}`}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>

                              {/* Percent of Month Total */}
                              <td
                                className="tabular-nums"
                                style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)' }}
                              >
                                {row.percentOfTotal > 0 ? `${row.percentOfTotal.toFixed(1)}%` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
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
                    onClick={() => openModal('select')}
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
                <td
                  className="ws-td-category ws-footer-label"
                  style={{ background: 'var(--bg-surface-elevated)', color: 'var(--cash-green)' }}
                >
                  Daily Cash Spent
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.cashSpent > 0
                      ? Math.round(dailySummaries[day].cashSpent).toLocaleString()
                      : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">
                  {formatCurrency(monthTotals.totalCashSpent, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 2. Daily Cards / Bank Spent */}
              <tr className="ws-footer-row row-card">
                <td
                  className="ws-td-category ws-footer-label"
                  style={{ background: 'var(--bg-surface-elevated)', color: 'var(--card-blue)' }}
                >
                  Daily Cards Spent
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.cardSpent > 0
                      ? Math.round(dailySummaries[day].cardSpent).toLocaleString()
                      : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">
                  {formatCurrency(monthTotals.totalCardSpent, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 3. Daily Grand Total Expenses */}
              <tr className="ws-footer-row row-grand-total">
                <td
                  className="ws-td-category ws-footer-label"
                  style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
                >
                  Daily Total Expenses
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums" style={{ fontWeight: 800 }}>
                    {dailySummaries[day]?.grandTotal > 0
                      ? Math.round(dailySummaries[day].grandTotal).toLocaleString()
                      : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(monthTotals.totalExpenses, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget tabular-nums">
                  {monthTotals.totalBudget > 0
                    ? formatCurrency(monthTotals.totalBudget, currencyCode, currencySymbol)
                    : '-'}
                </td>
                <td className="ws-td-variance tabular-nums">
                  {monthTotals.totalBudget > 0
                    ? formatCurrency(monthTotals.totalBudget - monthTotals.totalExpenses, currencyCode, currencySymbol)
                    : '-'}
                </td>
                <td>100%</td>
              </tr>

              {/* 4. Daily Bank Withdrawals into Cash */}
              <tr className="ws-footer-row row-withdrawal">
                <td
                  className="ws-td-category ws-footer-label"
                  style={{ background: 'var(--bg-surface-elevated)', color: 'var(--warning-amber)' }}
                >
                  Bank Withdrawals (Cash IN)
                </td>
                {days.map((day) => (
                  <td key={day} className="tabular-nums">
                    {dailySummaries[day]?.bankWithdrawal > 0
                      ? Math.round(dailySummaries[day].bankWithdrawal).toLocaleString()
                      : '-'}
                  </td>
                ))}
                <td className="ws-td-total tabular-nums">
                  {formatCurrency(monthTotals.totalWithdrawals, currencyCode, currencySymbol)}
                </td>
                <td className="ws-td-budget">-</td>
                <td className="ws-td-variance">-</td>
                <td>-</td>
              </tr>

              {/* 5. End-of-Day (EOD) Cash in Hand */}
              <tr className="ws-footer-row row-eod-cash">
                <td
                  className="ws-td-category ws-footer-label"
                  style={{ background: 'var(--bg-surface-elevated)', color: 'var(--primary)' }}
                >
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
          categories={allCategories}
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
          initialTab={modalInitialTab}
          onClose={() => setIsGlModalOpen(false)}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
