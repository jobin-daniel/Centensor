'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building2,
  CreditCard,
  BookOpen,
  DollarSign,
  Layers,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  X,
} from 'lucide-react';
import { AccountBook, Institution, Account, Currency, Category, CategoryHead } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

type SettingsTab = 'institutions' | 'accounts' | 'books' | 'currencies' | 'categories';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('institutions');
  const [loading, setLoading] = useState(true);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [books, setBooks] = useState<AccountBook[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryHeads, setCategoryHeads] = useState<CategoryHead[]>([]);

  // Main Head and Sub Head states
  const [catSearch, setCatSearch] = useState('');
  const [collapsedHeads, setCollapsedHeads] = useState<Record<number, boolean>>({});

  // Head Modal State
  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<CategoryHead | null>(null);
  const [headName, setHeadName] = useState('');
  const [headIcon, setHeadIcon] = useState('📁');
  const [headColor, setHeadColor] = useState('#6366F1');

  // Sub Head Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Category | null>(null);
  const [subHeadId, setSubHeadId] = useState<number | ''>('');
  const [subName, setSubName] = useState('');
  const [subIcon, setSubIcon] = useState('🏷️');
  const [subColor, setSubColor] = useState('#10B981');
  const [subBudget, setSubBudget] = useState('0');

  // Modals / Form states
  const [newInstName, setNewInstName] = useState('');
  const [newInstCountry, setNewInstCountry] = useState('IN');

  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('bank');
  const [newAccBookId, setNewAccBookId] = useState<number>(1);
  const [newAccInstId, setNewAccInstId] = useState<string>('');
  const [newAccCurr, setNewAccCurr] = useState('INR');
  const [newAccBalance, setNewAccBalance] = useState('0');
  const [newAccLimit, setNewAccLimit] = useState('0');

  const [newBookName, setNewBookName] = useState('');
  const [newBookCurr, setNewBookCurr] = useState('INR');
  const [newBookDesc, setNewBookDesc] = useState('');


  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [mdRes, booksRes, catRes] = await Promise.all([
        fetch('/api/master-data'),
        fetch('/api/books'),
        fetch('/api/categories'),
      ]);
      const [mdJson, booksJson, catJson] = await Promise.all([
        mdRes.json(),
        booksRes.json(),
        catRes.json(),
      ]);

      if (mdJson.success) {
        setInstitutions(mdJson.data.institutions);
        setAccounts(mdJson.data.accounts);
        setCurrencies(mdJson.data.currencies);
      }
      if (booksJson.success) setBooks(booksJson.books);
      if (catJson.success) {
        setCategories(catJson.categories || []);
        setCategoryHeads(catJson.heads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [mdRes, booksRes, catRes] = await Promise.all([
          fetch('/api/master-data'),
          fetch('/api/books'),
          fetch('/api/categories'),
        ]);
        const [mdJson, booksJson, catJson] = await Promise.all([
          mdRes.json(),
          booksRes.json(),
          catRes.json(),
        ]);
        if (!cancelled) {
          if (mdJson.success) {
            setInstitutions(mdJson.data.institutions);
            setAccounts(mdJson.data.accounts);
            setCurrencies(mdJson.data.currencies);
          }
          if (booksJson.success) setBooks(booksJson.books);
          if (catJson.success) {
            setCategories(catJson.categories || []);
            setCategoryHeads(catJson.heads || []);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Category Head & Sub Head Handlers ---
  const toggleCollapseHead = (headId: number) => {
    setCollapsedHeads((prev) => ({ ...prev, [headId]: !prev[headId] }));
  };

  const openCreateHeadModal = () => {
    setEditingHead(null);
    setHeadName('');
    setHeadIcon('📁');
    setHeadColor('#6366F1');
    setIsHeadModalOpen(true);
  };

  const openEditHeadModal = (h: CategoryHead) => {
    setEditingHead(h);
    setHeadName(h.name);
    setHeadIcon(h.icon || '📁');
    setHeadColor(h.color || '#6366F1');
    setIsHeadModalOpen(true);
  };

  const handleSaveHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) return;

    try {
      const url = '/api/categories';
      const method = editingHead ? 'PUT' : 'POST';
      const body = editingHead
        ? { action: 'update_head', id: editingHead.id, name: headName.trim(), icon: headIcon, color: headColor }
        : { action: 'create_head', name: headName.trim(), icon: headIcon, color: headColor };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setIsHeadModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to save Main Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving Main Head');
    }
  };

  const handleDeleteHead = async (h: CategoryHead) => {
    const subCount = h.sub_heads?.length || 0;
    const msg = subCount > 0
      ? `Main Head "${h.name}" contains ${subCount} Sub Heads. Deleting it will also delete its Sub Heads and unlink any transactions. Are you sure?`
      : `Are you sure you want to delete Main Head "${h.name}"?`;

    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/categories?id=${h.id}&type=head&cascade=true`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete Main Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting Main Head');
    }
  };

  const openCreateSubModal = (parentHeadId?: number) => {
    setEditingSub(null);
    setSubHeadId(parentHeadId || (categoryHeads[0]?.id ?? ''));
    setSubName('');
    setSubIcon('🏷️');
    const parentHead = categoryHeads.find((h) => h.id === parentHeadId);
    setSubColor(parentHead?.color || '#10B981');
    setSubBudget('0');
    setIsSubModalOpen(true);
  };

  const openEditSubModal = (sub: Category) => {
    setEditingSub(sub);
    setSubHeadId(sub.head_id || (categoryHeads.find((h) => h.name === sub.group_name)?.id ?? ''));
    setSubName(sub.name);
    setSubIcon(sub.icon || '🏷️');
    setSubColor(sub.color || '#10B981');
    setSubBudget(String(sub.monthly_budget || 0));
    setIsSubModalOpen(true);
  };

  const handleSaveSubHead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    try {
      const url = '/api/categories';
      const method = editingSub ? 'PUT' : 'POST';
      const parentHead = categoryHeads.find((h) => h.id === Number(subHeadId));
      const body = editingSub
        ? {
            action: 'update_subhead',
            id: editingSub.id,
            head_id: subHeadId ? Number(subHeadId) : null,
            name: subName.trim(),
            group_name: parentHead?.name || editingSub.group_name,
            icon: subIcon,
            color: subColor,
          }
        : {
            action: 'create_subhead',
            head_id: subHeadId ? Number(subHeadId) : null,
            name: subName.trim(),
            group_name: parentHead?.name,
            icon: subIcon,
            color: subColor,
            monthly_budget: parseFloat(subBudget) || 0,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setIsSubModalOpen(false);
        fetchAllData();
      } else {
        alert(json.error || 'Failed to save Sub Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving Sub Head');
    }
  };

  const handleDeleteSub = async (sub: Category) => {
    if (!confirm(`Are you sure you want to delete Sub Head "${sub.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories?id=${sub.id}&type=subhead`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        fetchAllData();
      } else {
        alert(json.error || 'Failed to delete Sub Head');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting Sub Head');
    }
  };

  const handleResetCategories = async () => {
    const confirmed = confirm(
      'Are you sure you want to load the recommended template of Main Heads (Food, Transport, House, Shopping, Entertainment, Health, Bills, Travel, Pets, Clothes, Taxi/Misc, Charity, Stationary, Govt. Expenses, Taxes) and Sub Heads?\n\nThis will install the full suggested taxonomy.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_defaults' }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Successfully applied recommended Main Heads & Sub Heads template!');
        fetchAllData();
      } else {
        alert(json.error || 'Failed to reset categories');
      }
    } catch (err) {
      console.error(err);
      alert('Error resetting categories');
    }
  };

  const handleAddInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName) return;
    try {
      const res = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_institution',
          payload: { name: newInstName, country_code: newInstCountry },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewInstName('');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName) return;
    try {
      const res = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_account',
          payload: {
            book_id: newAccBookId,
            institution_id: newAccInstId ? parseInt(newAccInstId, 10) : null,
            name: newAccName,
            type: newAccType,
            currency_code: newAccCurr,
            opening_balance: parseFloat(newAccBalance) || 0,
            credit_limit: parseFloat(newAccLimit) || 0,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewAccName('');
        setNewAccBalance('0');
        setNewAccLimit('0');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookName) return;
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBookName,
          currency_code: newBookCurr,
          description: newBookDesc,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewBookName('');
        setNewBookDesc('');
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRate = async (code: string, newRate: number) => {
    try {
      await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_currency_rate',
          payload: { code, rate: newRate },
        }),
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetMasterCurrency = async (code: string) => {
    try {
      await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_master_currency',
          payload: { code },
        }),
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };


  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
              <Sliders size={20} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Master Data & System Settings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Configure Banks, Credit Cards, Payment Accounts, Account Books (Countries), Currencies, and General Ledger Accounts.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchAllData} title="Refresh data">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', overflowX: 'auto', marginBottom: '24px' }}>
        <button
          className={`btn ${activeTab === 'institutions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('institutions')}
        >
          <Building2 size={16} />
          <span>Banks & Institutions ({institutions.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('accounts')}
        >
          <CreditCard size={16} />
          <span>Payment Accounts ({accounts.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'books' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('books')}
        >
          <BookOpen size={16} />
          <span>Account Books ({books.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'currencies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('currencies')}
        >
          <DollarSign size={16} />
          <span>Currencies & Rates ({currencies.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={16} />
          <span>GL Categories ({categories.length})</span>
        </button>
      </div>

      {/* Tab 1: Institutions */}
      {activeTab === 'institutions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* List */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Configured Institutions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {institutions.map((inst) => (
                <div
                  key={inst.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Building2 size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 600 }}>{inst.name}</span>
                  </div>
                  <span className="badge badge-cash">{inst.country_code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add form */}
          <form
            onSubmit={handleAddInstitution}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Add New Bank / Institution</h3>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Barclays, Citibank, Standard Chartered"
                className="form-input"
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Country Code</label>
              <select className="form-select" value={newInstCountry} onChange={(e) => setNewInstCountry(e.target.value)}>
                <option value="IN">India (IN)</option>
                <option value="AE">United Arab Emirates (AE)</option>
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="EU">European Union (EU)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Save Bank</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Accounts */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
          {/* List */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Master Accounts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{acc.name}</span>
                      <span className="badge badge-debit" style={{ fontSize: '10px' }}>
                        {acc.book_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Type: {acc.type} {acc.credit_limit ? `| Limit: ${acc.credit_limit}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(acc.current_balance, acc.currency_code, acc.currency_symbol)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add form */}
          <form
            onSubmit={handleAddAccount}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Add New Account</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Link to Account Book</label>
              <select className="form-select" value={newAccBookId} onChange={(e) => setNewAccBookId(parseInt(e.target.value, 10))}>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.currency_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Account Name</label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Regalia Card, ENBD Savings"
                className="form-input"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">Account Type</label>
                <select className="form-select" value={newAccType} onChange={(e) => setNewAccType(e.target.value)}>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank">Bank Account</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={newAccCurr} onChange={(e) => setNewAccCurr(e.target.value)}>
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                />
              </div>
              {newAccType === 'credit_card' && (
                <div className="form-group">
                  <label className="form-label">Credit Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={newAccLimit}
                    onChange={(e) => setNewAccLimit(e.target.value)}
                  />
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Create Account</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Account Books */}
      {activeTab === 'books' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Account Books (Countries / Purposes)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {books.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{b.name}</span>
                    <span className="badge badge-cash">{b.currency_code}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {b.description || 'No description'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleAddBook}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: 'fit-content',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Create New Account Book</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Book Name</label>
              <input
                type="text"
                required
                placeholder="e.g. UK Relocation, Euro Summer Trip"
                className="form-input"
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Local Currency</label>
              <select className="form-select" value={newBookCurr} onChange={(e) => setNewBookCurr(e.target.value)}>
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Description / Purpose</label>
              <input
                type="text"
                placeholder="Purpose of this account book"
                className="form-input"
                value={newBookDesc}
                onChange={(e) => setNewBookDesc(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={16} />
              <span>Create Account Book</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Currencies & Exchange Rates */}
      {activeTab === 'currencies' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Currencies & Master Exchange Rates</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Exchange rates determine how local amounts in each book convert into the Master Reporting Base currency for consolidated analytics.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currencies.map((c) => (
              <div
                key={c.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: c.is_master_base ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>{c.code}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({c.symbol})</span>
                    {c.is_master_base ? (
                      <span className="badge badge-cash">Master Base Currency</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {c.name}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {!c.is_master_base && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>1 {c.code} =</span>
                      <input
                        type="number"
                        step="0.01"
                        style={{ width: '90px' }}
                        className="form-input"
                        defaultValue={c.exchange_rate_to_master}
                        onBlur={(e) => handleUpdateRate(c.code, parseFloat(e.target.value) || 1.0)}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Master Units</span>
                    </div>
                  )}

                  {!c.is_master_base && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '6px 10px' }}
                      onClick={() => handleSetMasterCurrency(c.code)}
                    >
                      Make Master Base
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Categories (Main Heads & Sub Heads) */}
      {activeTab === 'categories' && (
        <div>
          {/* Header & Controls */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={20} color="var(--primary)" />
                  <span>General Ledger Heads & Sub Heads</span>
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Configure your complete chart of accounts with hierarchical Main Heads (Expense Groups) and Sub Heads (Specific Categories). Not hardcoded — fully customizable!
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleResetCategories} title="Load standard template with Food, Car, House, Shopping, Entertainment, etc.">
                  <RotateCcw size={14} />
                  <span>Reset / Load Template</span>
                </button>
                <button className="btn btn-secondary" onClick={openCreateHeadModal}>
                  <FolderPlus size={14} />
                  <span>+ Main Head</span>
                </button>
                <button className="btn btn-primary" onClick={() => openCreateSubModal()}>
                  <Plus size={14} />
                  <span>+ Sub Head</span>
                </button>
              </div>
            </div>

            {/* Search and Summary */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ position: 'relative', width: '280px' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search heads or subheads..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>
                  Main Heads: <strong style={{ color: 'var(--text-primary)' }}>{categoryHeads.length}</strong>
                </span>
                <span>•</span>
                <span>
                  Sub Heads: <strong style={{ color: 'var(--text-primary)' }}>{categories.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Main Heads & Sub Heads List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categoryHeads.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <Layers size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No Categories Configured</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 16px' }}>
                  Get started immediately by loading the recommended General Ledger taxonomy (Food, Transport, House, Shopping, Entertainment, etc.) or create your own custom heads.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleResetCategories}>
                    <RotateCcw size={14} />
                    <span>Load Recommended Template</span>
                  </button>
                  <button className="btn btn-secondary" onClick={openCreateHeadModal}>
                    <Plus size={14} />
                    <span>Create Custom Main Head</span>
                  </button>
                </div>
              </div>
            ) : (
              categoryHeads
                .filter((head) => {
                  if (!catSearch) return true;
                  const term = catSearch.toLowerCase();
                  const matchHead = head.name.toLowerCase().includes(term);
                  const matchSub = (head.sub_heads || []).some((s) => s.name.toLowerCase().includes(term));
                  return matchHead || matchSub;
                })
                .map((head) => {
                  const isCollapsed = collapsedHeads[head.id];
                  const subs = (head.sub_heads || []).filter((s) => {
                    if (!catSearch) return true;
                    const term = catSearch.toLowerCase();
                    return s.name.toLowerCase().includes(term) || head.name.toLowerCase().includes(term);
                  });

                  return (
                    <div
                      key={head.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Main Head Header Card */}
                      <div
                        style={{
                          padding: '14px 18px',
                          background: 'var(--bg-surface-elevated)',
                          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                          onClick={() => toggleCollapseHead(head.id)}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                          </button>

                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: head.color ? `${head.color}22` : 'var(--primary-subtle)',
                              border: `1px solid ${head.color || 'var(--primary)'}44`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                            }}
                          >
                            {head.icon || '📁'}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {head.name}
                              </span>
                              <span
                                className="badge"
                                style={{
                                  background: 'var(--bg-app)',
                                  color: 'var(--text-secondary)',
                                  fontSize: '11px',
                                }}
                              >
                                {head.sub_heads?.length || 0} Sub Heads
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions on Main Head */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={() => openCreateSubModal(head.id)}
                            title="Add Sub Head under this Main Head"
                          >
                            <Plus size={13} />
                            <span>Add Sub Head</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px' }}
                            onClick={() => openEditHeadModal(head)}
                            title="Edit Main Head"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--danger-rose)' }}
                            onClick={() => handleDeleteHead(head)}
                            title="Delete Main Head"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Sub Heads Grid (Shown when not collapsed) */}
                      {!isCollapsed && (
                        <div style={{ padding: '16px 18px' }}>
                          {subs.length === 0 ? (
                            <div
                              style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '12px',
                                background: 'var(--bg-surface-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border-subtle)',
                              }}
                            >
                              No sub heads under this main head yet.{' '}
                              <button
                                type="button"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                                onClick={() => openCreateSubModal(head.id)}
                              >
                                Create the first sub head
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                gap: '10px',
                              }}
                            >
                              {subs.map((sub) => (
                                <div
                                  key={sub.id}
                                  style={{
                                    padding: '10px 14px',
                                    background: 'var(--bg-surface-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '10px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <div
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: sub.color || head.color || '#10B981',
                                        flexShrink: 0,
                                      }}
                                    />
                                    {sub.icon && <span style={{ fontSize: '14px' }}>{sub.icon}</span>}
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          fontSize: '13px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={sub.name}
                                      >
                                        {sub.name}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: 'var(--radius-sm)',
                                      }}
                                      onClick={() => openEditSubModal(sub)}
                                      title="Edit Sub Head"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: 'var(--radius-sm)',
                                      }}
                                      onClick={() => handleDeleteSub(sub)}
                                      title="Delete Sub Head"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Main Head Create/Edit Modal */}
      {isHeadModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHeadModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingHead ? 'Edit Main Head' : 'Add New Main Head'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsHeadModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHead} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Main Head Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🍔 Food / Eating out, 🚗 Car / Transport"
                  className="form-input"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Emoji / Icon</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={headIcon}
                    onChange={(e) => setHeadIcon(e.target.value)}
                    style={{ width: '80px', fontSize: '18px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    Type an emoji or pick from below:
                  </span>
                </div>
                {/* Emoji presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['🍔', '🚗', '🏠', '🛒', '🎬', '💊', '📞', '✈️', '🐾', '👚', '❓', '🎁', '📚', '🏛️', '💰', '👶', '💼', '☕', '💡', '🔧'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setHeadIcon(emoji)}
                      style={{
                        padding: '6px 8px',
                        background: headIcon === emoji ? 'var(--primary-subtle)' : 'var(--bg-surface-elevated)',
                        border: headIcon === emoji ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Accent Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {[
                    '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#A855F7',
                    '#EF4444', '#06B6D4', '#0EA5E9', '#F97316', '#D946EF',
                    '#64748B', '#14B8A6', '#84CC16', '#EAB308', '#F43F5E'
                  ].map((clr) => (
                    <div
                      key={clr}
                      onClick={() => setHeadColor(clr)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: clr,
                        cursor: 'pointer',
                        border: headColor === clr ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: headColor === clr ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsHeadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHead ? 'Save Changes' : 'Create Main Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub Head Create/Edit Modal */}
      {isSubModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSubModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingSub ? 'Edit Sub Head' : 'Add New Sub Head'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsSubModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubHead} className="modal-body">
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Parent Main Head</label>
                <select
                  className="form-select"
                  value={subHeadId}
                  onChange={(e) => {
                    const hId = Number(e.target.value);
                    setSubHeadId(hId);
                    const selHead = categoryHeads.find((h) => h.id === hId);
                    if (selHead && selHead.color) {
                      setSubColor(selHead.color);
                    }
                  }}
                  required
                >
                  <option value="">-- Select Main Head --</option>
                  {categoryHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.icon} {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Sub Head Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Groceries, Restaurants, Fast food"
                  className="form-input"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Icon / Emoji</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={subIcon}
                    onChange={(e) => setSubIcon(e.target.value)}
                    style={{ width: '80px', fontSize: '18px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    Emoji representing this specific sub-head
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Color Indicator</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {[
                    '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#A855F7',
                    '#EF4444', '#06B6D4', '#0EA5E9', '#F97316', '#D946EF',
                    '#64748B', '#14B8A6', '#84CC16', '#EAB308', '#F43F5E'
                  ].map((clr) => (
                    <div
                      key={clr}
                      onClick={() => setSubColor(clr)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: clr,
                        cursor: 'pointer',
                        border: subColor === clr ? '2px solid #ffffff' : '2px solid transparent',
                        boxShadow: subColor === clr ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSubModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSub ? 'Save Changes' : 'Create Sub Head'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

