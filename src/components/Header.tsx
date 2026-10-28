'use client';

import React, { useState } from 'react';
import {
  Wallet,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Moon,
  Globe2,
  Calendar,
  Building,
  Sparkles,
  LogOut,
  User,
  Sliders,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { AccountBook } from '@/lib/types';
import { getMonthName } from '@/lib/formatters';

interface HeaderProps {
  books: AccountBook[];
  activeBookId: number;
  onSelectBook: (id: number) => void;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  onOpenNewTxModal: () => void;
}

export default function Header({
  books,
  activeBookId,
  onSelectBook,
  year,
  month,
  onMonthChange,
  onOpenNewTxModal,
}: HeaderProps) {
  const { data: session } = useSession();
  const [isBookMenuOpen, setIsBookMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const activeBook = books.find((b) => b.id === activeBookId) || books[0];

  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(year - 1, 12);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(year + 1, 1);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth() + 1);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Flag or icon for book
  const getBookBadge = (name: string) => {
    if (name.includes('Home') || name.includes('India')) return '🇮🇳';
    if (name.includes('UAE') || name.includes('Dubai')) return '🇦🇪';
    if (name.includes('US') || name.includes('Travel')) return '🇺🇸';
    return '💼';
  };

  return (
    <header className="app-header">
      <div className="header-content container">
        {/* Brand & Book Selector */}
        <div className="brand-section">
          <div className="brand-logo" title="Centensor Super-App">
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="brand-title">
              <span className="brand-title-cent">Cent</span>
              <span className="brand-title-neu">ensor</span>
            </h1>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '2px 6px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                color: '#ffffff',
                textTransform: 'uppercase',
              }}
            >
              PRO
            </span>
          </div>

          {/* Book Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="book-switcher-btn"
              onClick={() => setIsBookMenuOpen(!isBookMenuOpen)}
              title="Switch Account Book / Country"
            >
              <span style={{ fontSize: '15px' }}>{getBookBadge(activeBook?.name || '')}</span>
              <span style={{ fontWeight: 600 }}>{activeBook?.name || 'Account Book'}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#f8fafc',
                }}
              >
                {activeBook?.currency_code}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </button>

            {isBookMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 20px 40px -6px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.15)',
                  zIndex: 60,
                  minWidth: '260px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div
                  style={{
                    padding: '10px 16px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  Switch Account Book / Ledger
                </div>
                {books.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBook(b.id);
                      setIsBookMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '12px 16px',
                      background: b.id === activeBookId ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(236, 72, 153, 0.12))' : 'transparent',
                      color: b.id === activeBookId ? '#ffffff' : 'var(--text-primary)',
                      border: 'none',
                      textAlign: 'left',
                      fontWeight: b.id === activeBookId ? 700 : 500,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{getBookBadge(b.name)}</span>
                      <div>
                        <div style={{ fontSize: '13px' }}>{b.name}</div>
                        {b.is_default ? (
                          <span style={{ fontSize: '10px', color: 'var(--primary)' }}>Default Book</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {b.currency_code} ({b.currency_symbol || ''})
                    </span>
                  </button>
                ))}
                <a
                  href="/settings?tab=books"
                  onClick={() => setIsBookMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '11px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    background: 'rgba(139, 92, 246, 0.08)',
                    textDecoration: 'none',
                    borderTop: '1px solid var(--border-subtle)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sliders size={13} />
                  <span>Manage / Edit Account Books →</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Date Navigator - Pill Capsule */}
        <div className="date-navigator">
          <button className="nav-arrow-btn" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <div className="current-month-display" onClick={handleToday} title="Click to jump to Today">
            {getMonthName(month)} {year}
          </div>
          <button className="nav-arrow-btn" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Actions: New Transaction + Theme Toggle + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-primary" onClick={onOpenNewTxModal}>
            <Plus size={16} />
            <span>Add Expense</span>
          </button>

          <button
            onClick={toggleTheme}
            className="nav-arrow-btn"
            style={{
              width: '36px',
              height: '36px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#6366f1" />}
          </button>

          {/* User Account Menu */}
          {session?.user && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px 4px 6px',
                  borderRadius: '999px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  transition: 'all 0.15s ease',
                }}
                title="User Profile & Settings"
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.user.name || session.user.email}
                </span>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {isUserMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 20px 40px -6px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.15)',
                    zIndex: 70,
                    minWidth: '220px',
                    overflow: 'hidden',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {session.user.name || 'Tenant User'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                      {session.user.email}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          textTransform: 'uppercase',
                        }}
                      >
                        PRO PLAN • TENANT ACTIVE
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
