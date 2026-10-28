'use client';

import React from 'react';
import { PieChart, Table2, TrendingUp, Target, Receipt, Globe2, Sliders } from 'lucide-react';

export type NavTabType = 'dashboard' | 'worksheet' | 'income' | 'budget' | 'ledger' | 'master_book' | 'settings';

interface NavigationProps {
  activeTab: NavTabType;
  onTabChange: (tab: NavTabType) => void;
  currencyCode?: string;
}

export default function Navigation({ activeTab, onTabChange, currencyCode }: NavigationProps) {
  return (
    <nav className="app-nav">
      <div className="container" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <PieChart size={16} color={activeTab === 'dashboard' ? '#a78bfa' : 'currentColor'} />
          <span>Expenses Dashboard</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'worksheet' ? 'active' : ''}`}
          onClick={() => onTabChange('worksheet')}
        >
          <Table2 size={16} color={activeTab === 'worksheet' ? '#38bdf8' : 'currentColor'} />
          <span>Month Worksheet</span>
          {currencyCode && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              {currencyCode}
            </span>
          )}
        </button>

        <button
          className={`nav-tab ${activeTab === 'income' ? 'active' : ''}`}
          onClick={() => onTabChange('income')}
        >
          <TrendingUp size={16} color={activeTab === 'income' ? '#34d399' : 'currentColor'} />
          <span>Income</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => onTabChange('budget')}
        >
          <Target size={16} color={activeTab === 'budget' ? '#10b981' : 'currentColor'} />
          <span>Monthly Budget</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => onTabChange('ledger')}
        >
          <Receipt size={16} color={activeTab === 'ledger' ? '#ec4899' : 'currentColor'} />
          <span>Transactions Ledger</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'master_book' ? 'active' : ''}`}
          onClick={() => onTabChange('master_book')}
        >
          <Globe2 size={16} color={activeTab === 'master_book' ? '#f59e0b' : 'currentColor'} />
          <span>Consolidated Master Book</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <Sliders size={16} color={activeTab === 'settings' ? '#06b6d4' : 'currentColor'} />
          <span>Categories & Settings</span>
        </button>
      </div>
    </nav>
  );
}
