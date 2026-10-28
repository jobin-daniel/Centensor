'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Plus,
  Search,
  Layers,
  Copy,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Lock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ListOrdered,
  ListFilter,
} from 'lucide-react';
import { CategoryHead, Category, MonthlyGlPreferences } from '@/lib/types';

interface MonthGlHeadsModalProps {
  bookId: number;
  bookName: string;
  year: number;
  month: number;
  monthName: string;
  initialTab?: 'select' | 'reorder';
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#84CC16', // Lime
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

const PRESET_ICONS = ['📁', '🍔', '🚗', '🏠', '🛒', '🎬', '💊', '📞', '✈️', '👔', '🎁', '📚', '🏛️', '💰', '👶', '🎓', '🐾', '🏋️'];

type ModalTab = 'select' | 'reorder';

export default function MonthGlHeadsModal({
  bookId,
  bookName,
  year,
  month,
  monthName,
  initialTab = 'select',
  onClose,
  onSuccess,
}: MonthGlHeadsModalProps) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<MonthlyGlPreferences | null>(null);

  // Local selection states - ordered array for heads so arrangement is preserved!
  const [selectedHeadIds, setSelectedHeadIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [expandedHeads, setExpandedHeads] = useState<Set<number>>(new Set());

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inline "Create New Head" state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHeadName, setNewHeadName] = useState('');
  const [newHeadIcon, setNewHeadIcon] = useState('📁');
  const [newHeadColor, setNewHeadColor] = useState('#6366F1');
  const [newSubHeads, setNewSubHeads] = useState('');
  const [isCreatingHead, setIsCreatingHead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch current preferences for this month
  const fetchPreferences = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/worksheet/gl-heads?bookId=${bookId}&monthStr=${monthStr}`);
      const data = await res.json();
      if (data.success && data.preferences) {
        const pref: MonthlyGlPreferences = data.preferences;
        setPreferences(pref);
        setSelectedHeadIds([...pref.selectedHeadIds]);
        setSelectedCategoryIds(new Set(pref.selectedCategoryIds));
      } else {
        setErrorMessage(data.error || 'Failed to load GL heads preferences');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error while loading preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [bookId, monthStr]);

  const selectedHeadSet = useMemo(() => new Set(selectedHeadIds), [selectedHeadIds]);

  // Head lookup map
  const headMap = useMemo(() => {
    const map = new Map<number, CategoryHead>();
    preferences?.availableHeads.forEach((h) => map.set(h.id, h));
    return map;
  }, [preferences]);

  // Toggle head selection
  const handleToggleHead = (head: CategoryHead) => {
    const isSelected = selectedHeadSet.has(head.id);
    const hasTx = preferences?.headsWithTransactions.includes(head.id);

    if (isSelected && hasTx) {
      alert(`Cannot remove "${head.name}" because it already has transactions recorded in ${monthName} ${year}.`);
      return;
    }

    const nextCatIds = new Set(selectedCategoryIds);
    const subCategories = head.sub_heads || [];

    if (isSelected) {
      // Remove head
      setSelectedHeadIds((prev) => prev.filter((id) => id !== head.id));
      subCategories.forEach((sc) => nextCatIds.delete(sc.id));
    } else {
      // Append head to end of order
      setSelectedHeadIds((prev) => [...prev, head.id]);
      subCategories.forEach((sc) => nextCatIds.add(sc.id));
    }

    setSelectedCategoryIds(nextCatIds);
  };

  // Move active head up or down in order
  const handleMoveHead = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedHeadIds.length) return;

    setSelectedHeadIds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // HTML5 Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setSelectedHeadIds((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, removed);
      return copy;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Toggle individual sub-category selection
  const handleToggleSubCategory = (head: CategoryHead, subCategory: Category) => {
    const hasTx = preferences?.categoriesWithTransactions.includes(subCategory.id);
    if (selectedCategoryIds.has(subCategory.id) && hasTx) {
      alert(`Cannot remove "${subCategory.name}" because it has transactions recorded in ${monthName} ${year}.`);
      return;
    }

    const nextCatIds = new Set(selectedCategoryIds);
    const subCategories = head.sub_heads || [];

    if (nextCatIds.has(subCategory.id)) {
      nextCatIds.delete(subCategory.id);
      const anyRemaining = subCategories.some((sc) => sc.id !== subCategory.id && nextCatIds.has(sc.id));
      if (!anyRemaining) {
        setSelectedHeadIds((prev) => prev.filter((id) => id !== head.id));
      }
    } else {
      nextCatIds.add(subCategory.id);
      if (!selectedHeadSet.has(head.id)) {
        setSelectedHeadIds((prev) => [...prev, head.id]);
      }
    }

    setSelectedCategoryIds(nextCatIds);
  };

  // Toggle expansion of sub-heads in UI
  const handleToggleExpand = (headId: number) => {
    const next = new Set(expandedHeads);
    if (next.has(headId)) {
      next.delete(headId);
    } else {
      next.add(headId);
    }
    setExpandedHeads(next);
  };

  // Quick Action: Select All
  const handleSelectAll = () => {
    if (!preferences) return;
    const allHeadIds = preferences.availableHeads.map((h) => h.id);
    const allCatIds = new Set<number>();
    preferences.availableHeads.forEach((h) => {
      (h.sub_heads || []).forEach((sc) => allCatIds.add(sc.id));
    });
    setSelectedHeadIds(allHeadIds);
    setSelectedCategoryIds(allCatIds);
  };

  // Quick Action: Deselect All (except those with transactions)
  const handleDeselectAll = () => {
    if (!preferences) return;
    setSelectedHeadIds([...preferences.headsWithTransactions]);
    setSelectedCategoryIds(new Set(preferences.categoriesWithTransactions));
  };

  // Quick Action: Copy from Previous Month
  const handleCopyPrevious = async () => {
    if (!preferences?.previousMonth) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          monthStr,
          action: 'copy_previous',
          sourceMonth: preferences.previousMonth.month,
        }),
      });
      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
        setSelectedHeadIds([...data.preferences.selectedHeadIds]);
        setSelectedCategoryIds(new Set(data.preferences.selectedCategoryIds));
        onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to copy previous month preferences');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error copying previous month');
    } finally {
      setSaving(false);
    }
  };

  // Quick Action: Create New GL Head & Add to Month
  const handleCreateNewHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName.trim()) return;

    setIsCreatingHead(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          monthStr,
          action: 'create_and_add_head',
          name: newHeadName.trim(),
          icon: newHeadIcon,
          color: newHeadColor,
          subHeadNames: newSubHeads.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.preferences) {
        setPreferences(data.preferences);
        setSelectedHeadIds([...data.preferences.selectedHeadIds]);
        setSelectedCategoryIds(new Set(data.preferences.selectedCategoryIds));
        setNewHeadName('');
        setNewSubHeads('');
        setShowCreateForm(false);
        onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to create new GL head');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error creating GL head');
    } finally {
      setIsCreatingHead(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/worksheet/gl-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          monthStr,
          action: 'save',
          headIds: selectedHeadIds,
          categoryIds: Array.from(selectedCategoryIds),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(data.error || 'Failed to save preferences');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Network error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  // Filter available heads by search query
  const filteredHeads = useMemo(() => {
    if (!preferences) return [];
    if (!searchQuery.trim()) return preferences.availableHeads;

    const q = searchQuery.toLowerCase();
    return preferences.availableHeads.filter((h) => {
      const matchHead = h.name.toLowerCase().includes(q);
      const matchSub = (h.sub_heads || []).some((sc) => sc.name.toLowerCase().includes(q));
      return matchHead || matchSub;
    });
  }, [preferences, searchQuery]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--neu-magenta) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                  GL Heads for {monthName} {year}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                  }}
                >
                  {bookName}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                Select and rearrange General Ledger heads for this month. Order is saved per month and user.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs: Select vs Rearrange Order */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('select')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'select' ? 700 : 500,
              color: activeTab === 'select' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'select' ? 'var(--primary)' : 'transparent'}`,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            <ListFilter size={15} />
            <span>Select GL Heads ({preferences?.availableHeads.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reorder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'reorder' ? 700 : 500,
              color: activeTab === 'reorder' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'reorder' ? 'var(--primary)' : 'transparent'}`,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            <ListOrdered size={15} />
            <span>Arrange Display Order ({selectedHeadIds.length})</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '12px 28px',
              backgroundColor: 'var(--danger-rose-subtle)',
              borderBottom: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--danger-rose)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Toolbar & Search (Visible on 'select' tab) */}
        {activeTab === 'select' && (
          <div
            style={{
              padding: '14px 28px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              background: 'var(--bg-surface)',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search
                size={15}
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
                placeholder="Search GL heads or sub-categories..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
                  height: '36px',
                }}
              />
            </div>

            {/* Quick Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSelectAll}
                style={{ padding: '6px 12px', fontSize: '12px', height: '36px' }}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDeselectAll}
                style={{ padding: '6px 12px', fontSize: '12px', height: '36px' }}
              >
                Deselect All
              </button>

              {preferences?.previousMonth && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyPrevious}
                  disabled={saving}
                  title={`Copy ${preferences.previousMonth.count} heads from ${preferences.previousMonth.month}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    height: '36px',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                  }}
                >
                  <Copy size={13} />
                  <span>Copy from {preferences.previousMonth.month}</span>
                </button>
              )}

              <button
                type="button"
                className="btn"
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  height: '36px',
                  background: showCreateForm ? 'var(--bg-surface-hover)' : 'var(--primary-subtle)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                }}
              >
                <Plus size={14} />
                <span>{showCreateForm ? 'Cancel Head' : 'New GL Head'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible New GL Head Form */}
        {showCreateForm && activeTab === 'select' && (
          <form
            onSubmit={handleCreateNewHead}
            style={{
              padding: '16px 28px',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderBottom: '1px solid var(--border-subtle)',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={16} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Create Brand New GL Head & Add to {monthName}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  GL Head Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🍼 Baby Care, 🎓 Education"
                  className="form-input"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                  style={{ width: '100%', height: '36px', marginTop: '4px', fontSize: '13px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Sub-Categories (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daycare, Supplies, Doctor"
                  className="form-input"
                  value={newSubHeads}
                  onChange={(e) => setNewSubHeads(e.target.value)}
                  style={{ width: '100%', height: '36px', marginTop: '4px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Icon</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newHeadIcon}
                    onChange={(e) => setNewHeadIcon(e.target.value)}
                    style={{
                      width: '42px',
                      height: '36px',
                      textAlign: 'center',
                      fontSize: '18px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '140px' }}>
                    {PRESET_ICONS.slice(0, 6).map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setNewHeadIcon(ico)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '16px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Color</label>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                  {PRESET_COLORS.slice(0, 6).map((c) => (
                    <div
                      key={c}
                      onClick={() => setNewHeadColor(c)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: newHeadColor === c ? '2px solid #ffffff' : 'none',
                        boxShadow: newHeadColor === c ? '0 0 8px ' + c : 'none',
                      }}
                    />
                  ))}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isCreatingHead || !newHeadName.trim()}
                    style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '12px', height: '36px' }}
                  >
                    {isCreatingHead ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
              <p>Loading GL Heads...</p>
            </div>
          ) : activeTab === 'reorder' ? (
            /* Tab 2: REORDER & ARRANGE ACTIVE HEADS */
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Display Order in {monthName} Worksheet
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Drag & drop or use arrows to change the vertical order of GL heads on your worksheet grid.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                  }}
                >
                  {selectedHeadIds.length} Heads in Use
                </span>
              </div>

              {selectedHeadIds.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <FolderPlus size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600 }}>No GL heads selected for this month yet</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Switch to &ldquo;Select GL Heads&rdquo; tab to choose the heads you need.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setActiveTab('select')}
                    style={{ marginTop: '12px', fontSize: '12px' }}
                  >
                    Select Heads
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedHeadIds.map((hId, index) => {
                    const head = headMap.get(hId);
                    if (!head) return null;

                    const txCount = preferences?.transactionCountsByHead[hId] || 0;
                    const subHeads = head.sub_heads || [];
                    const isFirst = index === 0;
                    const isLast = index === selectedHeadIds.length - 1;
                    const isDragging = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;

                    return (
                      <div
                        key={hId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isDragging
                            ? 'var(--primary-subtle)'
                            : isDragOver
                            ? 'var(--bg-surface-hover)'
                            : 'var(--bg-surface-elevated)',
                          border: `1px solid ${
                            isDragOver ? 'var(--primary)' : isDragging ? 'var(--primary)' : 'var(--border-subtle)'
                          }`,
                          cursor: 'grab',
                          transition: 'all 0.15s ease',
                          opacity: isDragging ? 0.5 : 1,
                        }}
                      >
                        {/* Drag Handle & Order Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--text-muted)',
                              cursor: 'grab',
                            }}
                            title="Drag to rearrange"
                          >
                            <GripVertical size={18} />
                          </div>

                          {/* Position Number */}
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            #{index + 1}
                          </span>

                          {/* Head Icon */}
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: `${head.color || '#6366F1'}22`,
                              border: `1px solid ${head.color || '#6366F1'}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              flexShrink: 0,
                            }}
                          >
                            {head.icon || '📁'}
                          </div>

                          {/* Head Name & Sub count */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {head.name}
                              </span>
                              {txCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    backgroundColor: 'var(--cash-green-subtle)',
                                    color: 'var(--cash-green)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <Lock size={9} />
                                  {txCount} txns
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {subHeads.length} sub-accounts &bull; {subHeads.map((s) => s.name).join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Reorder Buttons: Move Up & Move Down */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveHead(index, 'up')}
                            className="btn-icon"
                            title="Move head up"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isFirst ? 'not-allowed' : 'pointer',
                              opacity: isFirst ? 0.35 : 1,
                            }}
                          >
                            <ArrowUp size={14} />
                          </button>

                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveHead(index, 'down')}
                            className="btn-icon"
                            title="Move head down"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              color: isLast ? 'var(--text-muted)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isLast ? 'not-allowed' : 'pointer',
                              opacity: isLast ? 0.35 : 1,
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab 1: SELECT & BROWSE HEADS */
            filteredHeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <FolderPlus size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>No GL Heads found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSearchQuery('')}
                  style={{ marginTop: '12px', fontSize: '12px' }}
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredHeads.map((head) => {
                  const isSelected = selectedHeadSet.has(head.id);
                  const isExpanded = expandedHeads.has(head.id);
                  const txCount = preferences?.transactionCountsByHead[head.id] || 0;
                  const subHeads = head.sub_heads || [];
                  const selectedSubCount = subHeads.filter((sc) => selectedCategoryIds.has(sc.id)).length;
                  const orderIndex = selectedHeadIds.indexOf(head.id);

                  return (
                    <div
                      key={head.id}
                      style={{
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                        transition: 'all 0.15s ease',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Main Head Row */}
                      <div
                        style={{
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleHead(head)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          {/* Checkbox */}
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-strong)'}`,
                              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              flexShrink: 0,
                              transition: 'all 0.15s',
                            }}
                          >
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>

                          {/* Order Badge if selected */}
                          {isSelected && orderIndex >= 0 && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--primary-subtle)',
                                color: 'var(--primary)',
                                fontFamily: 'var(--font-mono)',
                              }}
                              title={`Display position #${orderIndex + 1}`}
                            >
                              #{orderIndex + 1}
                            </span>
                          )}

                          {/* Head Icon */}
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: `${head.color || '#6366F1'}22`,
                              border: `1px solid ${head.color || '#6366F1'}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '20px',
                              flexShrink: 0,
                            }}
                          >
                            {head.icon || '📁'}
                          </div>

                          {/* Head Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                                {head.name}
                              </span>

                              {txCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '1px 7px',
                                    borderRadius: '999px',
                                    backgroundColor: 'var(--cash-green-subtle)',
                                    color: 'var(--cash-green)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Has transactions recorded in this month"
                                >
                                  <Lock size={10} />
                                  {txCount} {txCount === 1 ? 'txn' : 'txns'} in {monthName}
                                </span>
                              )}
                            </div>

                            {/* Sub-heads Summary Text */}
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {subHeads.length > 0
                                ? `${selectedSubCount} of ${subHeads.length} sub-accounts active: ${subHeads
                                    .map((sc) => sc.name)
                                    .join(', ')}`
                                : 'No sub-accounts defined'}
                            </p>
                          </div>
                        </div>

                        {/* Right Actions: Expand Sub-heads & Toggle Button */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {subHeads.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleToggleExpand(head.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span>{subHeads.length} Sub-accounts</span>
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleHead(head)}
                            className={isSelected ? 'btn btn-secondary' : 'btn btn-primary'}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              height: '30px',
                              fontWeight: 700,
                            }}
                          >
                            {isSelected ? 'In Use' : '+ Add'}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Sub-Categories List */}
                      {isExpanded && subHeads.length > 0 && (
                        <div
                          style={{
                            padding: '12px 18px 14px 50px',
                            borderTop: '1px solid var(--border-subtle)',
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '8px',
                          }}
                        >
                          {subHeads.map((subCat) => {
                            const isSubSelected = selectedCategoryIds.has(subCat.id);
                            const subTxCount = preferences?.transactionCountsByCategory[subCat.id] || 0;

                            return (
                              <div
                                key={subCat.id}
                                onClick={() => handleToggleSubCategory(head, subCat)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isSubSelected
                                    ? 'var(--bg-surface-elevated)'
                                    : 'transparent',
                                  border: `1px solid ${
                                    isSubSelected ? 'var(--primary)' : 'var(--border-subtle)'
                                  }`,
                                  cursor: 'pointer',
                                  transition: 'all 0.1s',
                                }}
                              >
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '4px',
                                    border: `1.5px solid ${
                                      isSubSelected ? 'var(--primary)' : 'var(--border-strong)'
                                    }`,
                                    backgroundColor: isSubSelected ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isSubSelected && <Check size={11} strokeWidth={3} />}
                                </div>

                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: isSubSelected ? 600 : 400,
                                    color: isSubSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1,
                                  }}
                                >
                                  {subCat.name}
                                </span>

                                {subTxCount > 0 && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '999px',
                                      backgroundColor: 'var(--cash-green-subtle)',
                                      color: 'var(--cash-green)',
                                    }}
                                    title={`${subTxCount} transactions in this sub-account`}
                                  >
                                    {subTxCount}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '18px 28px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: selectedHeadIds.length > 0 ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {selectedHeadIds.length} of {preferences?.availableHeads.length || 0} GL Heads selected for {monthName}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              ({selectedCategoryIds.size} active sub-accounts)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 22px', fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Save Preference'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
