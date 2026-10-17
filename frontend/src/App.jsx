import React, { useState, useEffect, useMemo, useRef } from 'react';
import AnalyticsView from './AnalyticsView';
import LedgerView from './LedgerView';
import SettingsView from './SettingsView';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Travel & Transit': '#38bdf8',
  'Entertainment': '#ec4899',
  'Utilities': '#10b981',
  'Academics & Tech': '#a855f7',
  'Miscellaneous': '#64748b'
};

const CATEGORIES = [
  'Food & Dining',
  'Travel & Transit',
  'Entertainment',
  'Utilities',
  'Academics & Tech',
  'Miscellaneous'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem('spendwise_token') || '');
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('spendwise_user') || '');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // App state
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem('spendwise_budget');
    return saved ? Number(saved) : 40000;
  });
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('ALL');

  // Affordability modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkItem, setCheckItem] = useState('');
  const [checkCost, setCheckCost] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const fileInputRef = useRef(null);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  const handleUpdateBudget = async (newVal) => {
    setMonthlyBudget(newVal);
    localStorage.setItem('spendwise_budget', String(newVal));

    if (!token) return;
    try {
      await fetch('/api/users/budget', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ monthlyBudget: newVal })
      });
    } catch (err) {
      console.error('Failed to persist budget:', err);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegisterMode
      ? { username: authUsername.trim(), email: authEmail.trim(), password: authPassword.trim() }
      : { username: authUsername.trim(), password: authPassword.trim() };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      localStorage.setItem('spendwise_token', data.token);
      localStorage.setItem('spendwise_user', data.username);
      setToken(data.token);
      setCurrentUser(data.username);
      setAuthPassword('');
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spendwise_token');
    localStorage.removeItem('spendwise_user');
    setToken('');
    setCurrentUser('');
    setExpenses([]);
  };

  const fetchExpenses = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExpenses();

      fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.monthlyBudget) {
            setMonthlyBudget(Number(data.monthlyBudget));
            localStorage.setItem('spendwise_budget', String(data.monthlyBudget));
          }
        })
        .catch((err) => console.error('Failed to fetch user settings:', err));
    }
  }, [token]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount) || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          category: category,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        const newRecord = await res.json();
        setExpenses((prev) => [newRecord, ...prev]);
        setTitle('');
        setAmount('');
      }
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;

    setIsParsing(true);
    try {
      const res = await fetch('/api/expenses/parse', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ prompt: quickPrompt.trim() })
      });

      if (res.ok) {
        const parsedRecord = await res.json();
        setExpenses((prev) => [parsedRecord, ...prev]);
        setQuickPrompt('');
      }
    } catch (err) {
      console.error('Quick Add failed:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAffordCheck = async (e) => {
    e.preventDefault();
    if (!checkItem.trim() || !checkCost || isNaN(checkCost)) return;

    setIsChecking(true);
    setVerdict(null);
    try {
      const res = await fetch('/api/expenses/can-i-afford', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          budget: monthlyBudget,
          cost: parseFloat(checkCost),
          item: checkItem.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVerdict(data);
      }
    } catch (err) {
      console.error('Affordability check failed:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('API delete error:', err);
    }
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExportCsv = () => {
    window.location.href = `/api/expenses/export?token=${encodeURIComponent(token)}`;
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        await fetchExpenses();
        alert(`Imported ${result.imported || 0} transactions!`);
      } else {
        alert('Failed to import CSV.');
      }
    } catch (err) {
      console.error('CSV import error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - currentDay);

    const totalSpent = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const dailyBurnRate = currentDay > 0 ? totalSpent / currentDay : 0;
    const projectedTotal = dailyBurnRate * daysInMonth;
    const remainingBudget = monthlyBudget - totalSpent;
    const recommendedDaily = daysRemaining > 0 ? Math.max(0, remainingBudget / daysRemaining) : 0;

    let badge = { text: 'On Track', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' };

    if (totalSpent > monthlyBudget) {
      badge = { text: 'Exceeded', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.25)' };
    } else if (projectedTotal > monthlyBudget) {
      badge = { text: 'Pacing High', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
    }

    const percentageUsed = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100));

    const categoryTotals = {};
    CATEGORIES.forEach((cat) => (categoryTotals[cat] = 0));
    expenses.forEach((item) => {
      const cat = item.category || 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(item.amount);
    });

    return {
      totalSpent,
      dailyBurnRate,
      projectedTotal,
      remainingBudget,
      recommendedDaily,
      currentDay,
      daysInMonth,
      daysRemaining,
      badge,
      percentageUsed,
      categoryTotals
    };
  }, [expenses, monthlyBudget]);

  const filteredExpenses = useMemo(() => {
    if (selectedFilterCategory === 'ALL') return expenses;
    return expenses.filter((e) => (e.category || 'Miscellaneous') === selectedFilterCategory);
  }, [expenses, selectedFilterCategory]);

  // Auth Screen
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 0%, #151922 0%, #08090a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#101216',
          borderRadius: '20px',
          maxWidth: '400px',
          width: '100%',
          padding: '2.5rem',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
          border: '1px solid #22262d'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>
              ₹
            </div>
            <div>
              <div style={{ color: '#f7f8f8', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>SpendWise</div>
              <div style={{ color: '#8a8f98', fontSize: '0.75rem' }}>Financial Precision</div>
            </div>
          </div>

          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700, color: '#f7f8f8' }}>
            {isRegisterMode ? 'Create Account' : 'Welcome back'}
          </h2>
          <p style={{ margin: '0 0 1.5rem', color: '#8a8f98', fontSize: '0.85rem' }}>
            {isRegisterMode ? 'Track and pace your personal runway.' : 'Sign in to access your ledger.'}
          </p>

          {authError && (
            <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={inputLabelStyle}>USERNAME</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
                placeholder="e.g. jahnavi"
                style={cleanInputStyle}
              />
            </div>

            {isRegisterMode && (
              <div>
                <label style={inputLabelStyle}>EMAIL</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  placeholder="e.g. user@example.com"
                  style={cleanInputStyle}
                />
              </div>
            )}

            <div>
              <label style={inputLabelStyle}>PASSWORD</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={cleanInputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              style={{
                marginTop: '0.5rem',
                padding: '0.85rem',
                backgroundColor: '#5e6ad2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {isAuthLoading ? 'Authenticating...' : (isRegisterMode ? 'Sign Up' : 'Continue')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#8a8f98' }}>
            {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(''); }}
              style={{ background: 'none', border: 'none', color: '#5e6ad2', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              {isRegisterMode ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#08090a' }}>
      
      {/* Precision Top Navbar */}
      <header style={{
        borderBottom: '1px solid #1a1c20',
        backgroundColor: '#0c0d0f',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{
          maxWidth: '1040px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5e6ad2 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#ffffff'
            }}>
              ₹
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f7f8f8', letterSpacing: '-0.02em' }}>SpendWise</div>
              <div style={{ fontSize: '0.7rem', color: '#8a8f98' }}>
                Active: <span style={{ color: '#d0d6e0', fontWeight: 600 }}>{currentUser}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={handleExportCsv} style={topBarBtnStyle}>Export</button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCsv} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={topBarBtnStyle}>Import</button>
            <button
              onClick={() => { setIsModalOpen(true); setVerdict(null); }}
              style={{
                backgroundColor: 'rgba(94, 106, 210, 0.15)',
                border: '1px solid rgba(94, 106, 210, 0.3)',
                color: '#8b96f5',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Affordability Check
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#14161a', border: '1px solid #24282c', padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#8a8f98', fontWeight: 600 }}>LIMIT</span>
              <span style={{ color: '#d0d6e0', fontWeight: 700, fontSize: '0.8rem' }}>₹</span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => handleUpdateBudget(Math.max(1, Number(e.target.value)))}
                style={{ width: '65px', backgroundColor: 'transparent', border: 'none', color: '#f7f8f8', fontWeight: 700, outline: 'none', fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #24282c',
                color: '#8a8f98',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ maxWidth: '1040px', margin: '2rem auto', padding: '0 1.5rem' }}>
        
        {/* Compact Segmented Control */}
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#101216',
          border: '1px solid #22262d',
          borderRadius: '10px',
          padding: '3px',
          marginBottom: '1.75rem',
          gap: '2px'
        }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'analytics', label: 'Analytics & Trends' },
            { id: 'ledger', label: 'Transactions' },
            { id: 'settings', label: 'Settings' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '7px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#1e2128' : 'transparent',
                  color: isActive ? '#f7f8f8' : '#8a8f98',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Primary Hero Card */}
            <div style={cleanCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Month-to-Date Spend • Day {stats.currentDay} of {stats.daysInMonth}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f7f8f8', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.03em' }}>
                      ₹{stats.totalSpent.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#8a8f98' }}>
                      of ₹{monthlyBudget.toLocaleString()} limit
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: stats.badge.bg, border: `1px solid ${stats.badge.border}`, color: stats.badge.color, padding: '0.35rem 0.85rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                  {stats.badge.text}
                </div>
              </div>

              {/* Progress Line */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#1a1c22', borderRadius: '3px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{
                  width: `${stats.percentageUsed}%`,
                  height: '100%',
                  backgroundColor: stats.percentageUsed > 90 ? '#f43f5e' : '#5e6ad2',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* 3 Metric Summary Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={metricBoxStyle}>
                  <div style={metricBoxLabelStyle}>DAILY BURN RATE</div>
                  <div style={metricBoxValStyle}>
                    ₹{Math.round(stats.dailyBurnRate).toLocaleString()}
                    <span style={{ fontSize: '0.72rem', color: '#8a8f98', fontWeight: 500 }}>/day</span>
                  </div>
                </div>

                <div style={metricBoxStyle}>
                  <div style={metricBoxLabelStyle}>PROJECTED TOTAL</div>
                  <div style={{ ...metricBoxValStyle, color: stats.projectedTotal > monthlyBudget ? '#f43f5e' : '#f7f8f8' }}>
                    ₹{Math.round(stats.projectedTotal).toLocaleString()}
                  </div>
                </div>

                <div style={metricBoxStyle}>
                  <div style={metricBoxLabelStyle}>RECOMMENDED PACE</div>
                  <div style={{ ...metricBoxValStyle, color: '#10b981' }}>
                    ₹{Math.round(stats.recommendedDaily).toLocaleString()}
                    <span style={{ fontSize: '0.72rem', color: '#8a8f98', fontWeight: 500 }}>/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Natural Language Quick-Add Input */}
            <div style={{ ...cleanCardStyle, backgroundColor: '#0f1115' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>✦</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f7f8f8' }}>AI Quick Add</span>
              </div>
              <p style={{ margin: '0 0 1rem 0', color: '#8a8f98', fontSize: '0.8rem' }}>
                Type an expense in plain language (e.g., <em>"Swiggy lunch 320"</em> or <em>"Metro card 500"</em>)
              </p>
              <form onSubmit={handleQuickAdd} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Describe transaction..."
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  disabled={isParsing}
                  style={{ flex: 1, ...cleanInputStyle }}
                />
                <button
                  type="submit"
                  disabled={isParsing || !quickPrompt.trim()}
                  style={{
                    padding: '0 1.25rem',
                    backgroundColor: '#5e6ad2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {isParsing ? 'Parsing...' : 'Add'}
                </button>
              </form>
            </div>

            {/* Category Breakdown Chips */}
            <div style={cleanCardStyle}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f7f8f8', marginBottom: '1rem' }}>
                Category Breakdown
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedFilterCategory('ALL')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: selectedFilterCategory === 'ALL' ? '1px solid #5e6ad2' : '1px solid #22262d',
                    backgroundColor: selectedFilterCategory === 'ALL' ? 'rgba(94, 106, 210, 0.15)' : '#14161b',
                    color: selectedFilterCategory === 'ALL' ? '#8b96f5' : '#8a8f98',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  All (₹{stats.totalSpent.toLocaleString()})
                </button>
                {CATEGORIES.map((cat) => {
                  const amt = stats.categoryTotals[cat] || 0;
                  const isSelected = selectedFilterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedFilterCategory(isSelected ? 'ALL' : cat)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: isSelected ? `1px solid ${CATEGORY_COLORS[cat]}` : '1px solid #22262d',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : '#14161b',
                        color: isSelected ? '#f7f8f8' : '#8a8f98',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[cat], marginRight: '6px' }} />
                      {cat}: ₹{amt.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Form */}
            <div style={cleanCardStyle}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f7f8f8', marginBottom: '1rem' }}>
                Manual Transaction Entry
              </div>
              <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Description"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{ flex: '3 1 180px', ...cleanInputStyle }}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ flex: '1.5 1 110px', ...cleanInputStyle }}
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ flex: '2 1 140px', ...cleanInputStyle, backgroundColor: '#14161b' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0 1.25rem',
                    backgroundColor: '#1f242d',
                    border: '1px solid #2a303c',
                    color: '#f7f8f8',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Saving...' : 'Add Record'}
                </button>
              </form>
            </div>

            {/* History Table */}
            <div style={cleanCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f7f8f8' }}>
                  Transactions {selectedFilterCategory !== 'ALL' && `(${selectedFilterCategory})`}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#8a8f98' }}>{filteredExpenses.length} Total</span>
              </div>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8a8f98', fontSize: '0.85rem' }}>Loading entries...</div>
              ) : filteredExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8a8f98', fontSize: '0.85rem' }}>No transactions recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {filteredExpenses.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#101216',
                        borderRadius: '8px',
                        border: '1px solid #1c1e24'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[tx.category] || '#64748b' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f7f8f8' }}>{tx.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#8a8f98', marginTop: '2px' }}>
                            {tx.date} • {tx.category || 'Miscellaneous'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f43f5e', fontFamily: "'JetBrains Mono', monospace" }}>
                          -₹{Number(tx.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(tx.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#62666d',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '4px'
                          }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: ANALYTICS & TRENDS */}
        {activeTab === 'analytics' && (
          <AnalyticsView transactions={expenses} monthlyBudget={monthlyBudget} />
        )}

        {/* TAB 3: TRANSACTION LEDGER */}
        {activeTab === 'ledger' && (
          <LedgerView transactions={expenses} onDeleteExpense={handleDeleteExpense} />
        )}

        {/* TAB 4: SETTINGS & PROFILE */}
        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            monthlyBudget={monthlyBudget}
            onUpdateBudget={handleUpdateBudget}
            token={token}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Affordability Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#121418',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            border: '1px solid #22262d'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f7f8f8' }}>Affordability Analysis</div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#8a8f98', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <p style={{ color: '#8a8f98', fontSize: '0.85rem', margin: '0 0 1.25rem 0' }}>
              Simulate an upcoming expense against your remaining runway of <strong style={{ color: '#f7f8f8' }}>₹{stats.remainingBudget.toLocaleString()}</strong> across <strong style={{ color: '#f7f8f8' }}>{stats.daysRemaining} days</strong>.
            </p>
            <form onSubmit={handleAffordCheck} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Item / purchase name"
                value={checkItem}
                onChange={(e) => setCheckItem(e.target.value)}
                required
                style={cleanInputStyle}
              />
              <input
                type="number"
                placeholder="Estimated cost (₹)"
                value={checkCost}
                onChange={(e) => setCheckCost(e.target.value)}
                required
                style={cleanInputStyle}
              />
              <button
                type="submit"
                disabled={isChecking}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  backgroundColor: '#5e6ad2',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {isChecking ? 'Evaluating...' : 'Check Feasibility'}
              </button>
            </form>

            {verdict && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: verdict.affordable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${verdict.affordable ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: verdict.affordable ? '#10b981' : '#f43f5e', marginBottom: '4px' }}>
                  {verdict.affordable ? 'Feasible' : 'Not Advised'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#d0d6e0', lineHeight: 1.4 }}>
                  {verdict.recommendation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Precision Style Tokens
const cleanCardStyle = {
  backgroundColor: '#121417',
  borderRadius: '12px',
  padding: '1.5rem',
  border: '1px solid #1f2328'
};

const metricBoxStyle = {
  backgroundColor: '#15181d',
  borderRadius: '8px',
  padding: '1rem',
  border: '1px solid #20242b'
};

const metricBoxLabelStyle = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#8a8f98',
  letterSpacing: '0.05em'
};

const metricBoxValStyle = {
  fontSize: '1.25rem',
  fontWeight: 800,
  color: '#f7f8f8',
  marginTop: '0.35rem',
  fontFamily: "'JetBrains Mono', monospace"
};

const cleanInputStyle = {
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid #262a32',
  backgroundColor: '#14161b',
  color: '#f7f8f8',
  fontSize: '0.85rem',
  outline: 'none'
};

const inputLabelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#8a8f98',
  marginBottom: '0.35rem'
};

const topBarBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid #24282c',
  color: '#8a8f98',
  padding: '0.45rem 0.75rem',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.78rem',
  cursor: 'pointer'
};