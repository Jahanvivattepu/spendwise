import React, { useState, useEffect, useMemo, useRef } from 'react';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Travel & Transit': '#3b82f6',
  'Entertainment': '#ec4899',
  'Utilities': '#10b981',
  'Academics & Tech': '#8b5cf6',
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
  const [monthlyBudget, setMonthlyBudget] = useState(25000);
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('ALL');

  // Affordability Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkItem, setCheckItem] = useState('');
  const [checkCost, setCheckCost] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [verdict, setVerdict] = useState(null);

  const fileInputRef = useRef(null);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
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
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || isNaN(amount) || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('API delete error:', err);
    }
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // Feature 2: CSV Export
  const handleExportCsv = () => {
    window.location.href = '/api/expenses/export';
  };

  // Feature 2: CSV Import
  const handleImportCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/expenses/import', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        await fetchExpenses();
        alert(`Imported ${result.imported || 0} transactions!`);
      } else {
        alert('Failed to import CSV file.');
      }
    } catch (err) {
      console.error('CSV import error:', err);
      alert('Error uploading statement file.');
    } finally {
      e.target.value = '';
    }
  };

  // Velocity Stats & Category Distributions
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

    let badge = { text: 'On Track', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };

    if (totalSpent > monthlyBudget) {
      badge = { text: 'Budget Exceeded', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
    } else if (projectedTotal > monthlyBudget) {
      badge = { text: 'Pacing High', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a' }}>
      
      {/* Navbar */}
      <nav style={{ backgroundColor: '#0f172a', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
            ₹
          </div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.15rem' }}>SpendWise</div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Autonomous Financial Intelligence</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleExportCsv}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            📥 Export CSV
          </button>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCsv}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            📤 Import CSV
          </button>

          <button
            onClick={() => { setIsModalOpen(true); setVerdict(null); }}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            💡 Can I Afford It?
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', padding: '0.4rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>Limit:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>₹</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Math.max(1, Number(e.target.value)))}
              style={{ width: '80px', backgroundColor: 'transparent', border: 'none', color: '#ffffff', fontWeight: 700, outline: 'none' }}
            />
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.25rem' }}>
        
        {/* Metric Velocity Card */}
        <section style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Velocity Status • Day {stats.currentDay} of {stats.daysInMonth}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>₹{stats.totalSpent.toLocaleString()}</span>
                <span style={{ color: '#64748b' }}>of ₹{monthlyBudget.toLocaleString()} limit</span>
              </div>
            </div>

            <div style={{ backgroundColor: stats.badge.bg, border: `1.5px solid ${stats.badge.border}`, color: stats.badge.color, padding: '0.5rem 1rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.85rem' }}>
              ● {stats.badge.text}
            </div>
          </div>

          <div style={{ width: '100%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ width: `${stats.percentageUsed}%`, height: '100%', backgroundColor: stats.badge.color, transition: 'width 0.5s ease-in-out' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>DAILY BURN RATE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e293b', marginTop: '0.35rem' }}>
                ₹{Math.round(stats.dailyBurnRate).toLocaleString()}<span style={{ fontSize: '0.8rem', color: '#94a3b8' }}> / day</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PROJECTED TOTAL</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: stats.projectedTotal > monthlyBudget ? '#ef4444' : '#1e293b', marginTop: '0.35rem' }}>
                ₹{Math.round(stats.projectedTotal).toLocaleString()}
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '14px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SAFE PACE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', marginTop: '0.35rem' }}>
                ₹{Math.round(stats.recommendedDaily).toLocaleString()}<span style={{ fontSize: '0.8rem', color: '#94a3b8' }}> / day</span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Breakdown Bar & Filter Chips */}
        <section style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
            Category Distribution
          </h3>

          <div style={{ width: '100%', height: '16px', borderRadius: '9999px', overflow: 'hidden', display: 'flex', backgroundColor: '#e2e8f0', marginBottom: '1.25rem' }}>
            {CATEGORIES.map((cat) => {
              const spent = stats.categoryTotals[cat] || 0;
              const pct = stats.totalSpent > 0 ? (spent / stats.totalSpent) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={cat}
                  title={`${cat}: ₹${spent.toLocaleString()} (${Math.round(pct)}%)`}
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat], transition: 'width 0.3s' }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            <button
              onClick={() => setSelectedFilterCategory('ALL')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: selectedFilterCategory === 'ALL' ? '#0f172a' : '#f1f5f9',
                color: selectedFilterCategory === 'ALL' ? '#ffffff' : '#64748b'
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
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${CATEGORY_COLORS[cat]}`,
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? CATEGORY_COLORS[cat] : '#ffffff',
                    color: isSelected ? '#ffffff' : CATEGORY_COLORS[cat]
                  }}
                >
                  {cat}: ₹{amt.toLocaleString()}
                </button>
              );
            })}
          </div>
        </section>

        {/* AI Quick-Add Bar */}
        <section style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: '18px',
          padding: '1.5rem',
          color: '#ffffff',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 15px rgba(49, 46, 129, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em' }}>AI Natural Language Quick-Add</span>
          </div>
          <p style={{ margin: '0 0 1rem 0', color: '#c7d2fe', fontSize: '0.85rem' }}>
            Type freely: <em>"Swiggy lunch 320"</em>, <em>"Uber to office 240"</em>, or <em>"AWS bill 1200"</em>
          </p>

          <form onSubmit={handleQuickAdd} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="e.g. Metro card recharge 500"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              disabled={isParsing}
              style={{
                flex: 1,
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid #4338ca',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '0.95rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={isParsing || !quickPrompt.trim()}
              style={{
                padding: '0.85rem 1.5rem',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: isParsing ? 0.7 : 1
              }}
            >
              {isParsing ? 'Parsing...' : 'Magic Add 🪄'}
            </button>
          </form>
        </section>

        {/* Manual Add Form */}
        <section style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#475569' }}>Manual Entry</h3>
          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Description"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ flex: '3 1 180px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none' }}
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{ flex: '1.5 1 110px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none' }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ flex: '2 1 140px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', backgroundColor: '#ffffff' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
            >
              {isSubmitting ? 'Saving...' : 'Add'}
            </button>
          </form>
        </section>

        {/* Transaction History */}
        <section style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              Transaction History {selectedFilterCategory !== 'ALL' && `(${selectedFilterCategory})`}
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{filteredExpenses.length} Records</span>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>Loading records...</div>
          ) : filteredExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 0' }}>No transactions recorded for this filter.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {filteredExpenses.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '10px',
                      height: '38px',
                      borderRadius: '4px',
                      backgroundColor: CATEGORY_COLORS[item.category] || '#64748b'
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.date}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: CATEGORY_COLORS[item.category] || '#64748b',
                          backgroundColor: '#f1f5f9',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px'
                        }}>
                          {item.category || 'Miscellaneous'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.05rem' }}>
                      -₹{Number(item.amount).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(item.id)}
                      style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', width: '28px', height: '28px', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* "Can I Afford It?" Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                💡 Can I Afford It?
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Simulate an upcoming expense against your remaining runway of <strong>₹{stats.remainingBudget.toLocaleString()}</strong> across <strong>{stats.daysRemaining} days</strong>.
            </p>

            <form onSubmit={handleAffordCheck} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ITEM OR SERVICE</label>
                <input
                  type="text"
                  placeholder="e.g. Wireless Headphones, Weekend Trip"
                  value={checkItem}
                  onChange={(e) => setCheckItem(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '0.25rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>ESTIMATED COST (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 2500"
                  value={checkCost}
                  onChange={(e) => setCheckCost(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '0.25rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={isChecking}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                {isChecking ? 'Evaluating Velocity Impact...' : 'Evaluate Feasibility ⚡'}
              </button>
            </form>

            {verdict && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: '12px',
                backgroundColor: verdict.affordable ? '#ecfdf5' : '#fef2f2',
                border: `1.5px solid ${verdict.affordable ? '#a7f3d0' : '#fecaca'}`
              }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: verdict.affordable ? '#065f46' : '#991b1b',
                  marginBottom: '0.4rem'
                }}>
                  {verdict.affordable ? '✅ Purchase Feasible' : '⚠️ Purchase Not Advised'}
                </div>
                <div style={{ fontSize: '0.9rem', color: verdict.affordable ? '#047857' : '#b91c1c', lineHeight: 1.5 }}>
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