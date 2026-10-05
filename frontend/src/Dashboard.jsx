```jsx
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import TransactionForm, { label } from './TransactionForm.jsx';

const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pad = (n) => String(n).padStart(2, '0');
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function Dashboard({ onLogout }) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }
  const [insight, setInsight] = useState('');
  const [insightError, setInsightError] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const load = useCallback(async () => {
    if (!month) return;
    try {
      const [s, t] = await Promise.all([
        api(`/dashboard?month=${month}`),
        api(`/transactions?month=${month}`),
      ]);
      setSummary(s);
      setTransactions(t);
    } catch (e) {
      flash('error', e.message);
    }
  }, [month]);

  useEffect(() => {
    load();
    setInsight('');
    setInsightError('');
  }, [load]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const saveTransaction = async (payload) => {
    if (editing) {
      await api(`/transactions/${editing.id}`, { method: 'PUT', body: payload });
    } else {
      await api('/transactions', { method: 'POST', body: payload });
    }
    flash('success', editing ? 'Transaction updated' : 'Transaction added');
    closeForm();
    await load();
  };

  const removeTransaction = async (t) => {
    if (!window.confirm(`Delete this transaction (${money(t.amount)})?`)) return;
    try {
      await api(`/transactions/${t.id}`, { method: 'DELETE' });
      flash('success', 'Transaction deleted');
      await load();
    } catch (e) {
      flash('error', e.message);
    }
  };

  const saveBudget = async (e) => {
    e.preventDefault();
    if (!budgetInput) return;
    try {
      await api('/budget', { method: 'PUT', body: { monthlyBudget: Number(budgetInput) } });
      setBudgetInput('');
      flash('success', 'Budget saved');
      await load();
    } catch (err) {
      flash('error', err.message);
    }
  };

  const generateInsight = async () => {
    setInsightLoading(true);
    setInsight('');
    setInsightError('');
    try {
      const res = await api(`/insights?month=${month}`, { method: 'POST' });
      setInsight(res.insight);
    } catch (e) {
      setInsightError(e.message);
    } finally {
      setInsightLoading(false);
    }
  };

  const hasBudget = summary && summary.monthlyBudget != null;
  const used = hasBudget ? Number(summary.budgetUsedPercent) : 0;
  const totalExpenses = summary ? Number(summary.expenses) : 0;

  return (
    <div>
      <header className="topbar">
        <span className="brand">SpendWise</span>
        <div className="topbar-right">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
          <button className="btn" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="container">
        {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

        {!summary ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <section className="stats">
              <div className="card stat">
                <span className="muted">Balance</span>
                <strong className={Number(summary.balance) < 0 ? 'expense' : ''}>{money(summary.balance)}</strong>
              </div>
              <div className="card stat">
                <span className="muted">Income</span>
                <strong className="income">{money(summary.income)}</strong>
              </div>
              <div className="card stat">
                <span className="muted">Expenses</span>
                <strong className="expense">{money(summary.expenses)}</strong>
              </div>
              <div className="card stat">
                <span className="muted">Budget</span>
                <strong>{hasBudget ? money(summary.monthlyBudget) : 'No budget set'}</strong>
              </div>
            </section>

            <section className="two-col">
              <div className="card">
                <h2>Budget status</h2>
                {hasBudget ? (
                  <>
                    <div className="progress">
                      <div className={`progress-fill ${used > 100 ? 'over' : ''}`} style={{ width: `${Math.min(used, 100)}%` }} />
                    </div>
                    <p>
                      {used.toFixed(1)}% used ·{' '}
                      {Number(summary.budgetRemaining) >= 0
                        ? `${money(summary.budgetRemaining)} remaining`
                        : `${money(Math.abs(Number(summary.budgetRemaining)))} over budget`}
                    </p>
                  </>
                ) : (
                  <p className="muted">No budget set</p>
                )}
                <form className="inline-form" onSubmit={saveBudget}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Monthly budget"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                  <button className="btn primary">Save budget</button>
                </form>
              </div>

              <div className="card">
                <h2>Spending by category</h2>
                {summary.spendingByCategory.length === 0 ? (
                  <p className="muted">No expenses this month.</p>
                ) : (
                  summary.spendingByCategory.map((c) => {
                    const pct = totalExpenses > 0 ? (Number(c.total) / totalExpenses) * 100 : 0;
                    return (
                      <div className="bar-row" key={c.category}>
                        <span className="bar-label">{label(c.category)}</span>
                        <div className="bar">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="bar-value">{money(c.total)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="card">
              <div className="row-between">
                <h2>AI Insight</h2>
                <button className="btn primary" onClick={generateInsight} disabled={insightLoading}>
                  {insightLoading ? 'Generating…' : 'Generate AI Insight'}
                </button>
              </div>
              {insightError && <div className="notice error">{insightError}</div>}
              {insight && <p className="insight">{insight}</p>}
              {!insight && !insightError && !insightLoading && (
                <p className="muted">Generate a short analysis of the selected month's spending.</p>
              )}
            </section>

            <section className="card">
              <div className="row-between">
                <h2>Transactions</h2>
                {!formOpen && (
                  <button className="btn primary" onClick={() => setFormOpen(true)}>+ Add transaction</button>
                )}
              </div>

              {formOpen && (
                <TransactionForm
                  key={editing ? editing.id : 'new'}
                  initial={editing}
                  defaultDate={month === currentMonth() ? today() : `${month}-01`}
                  onSave={saveTransaction}
                  onCancel={closeForm}
                />
              )}

              {transactions.length === 0 ? (
                <p className="muted">No transactions this month.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th className="right">Amount</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>{t.description || <span className="muted">—</span>}</td>
                          <td>{label(t.category)}</td>
                          <td className={`right ${t.type === 'INCOME' ? 'income' : 'expense'}`}>
                            {t.type === 'INCOME' ? '+' : '−'}{money(t.amount)}
                          </td>
                          <td className="right">
                            <button
                              className="btn small"
                              onClick={() => {
                                setEditing(t);
                                setFormOpen(true);
                              }}
                            >
                              Edit
                            </button>{' '}
                            <button className="btn small danger" onClick={() => removeTransaction(t)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
