```jsx
import { useState } from 'react';

export const CATEGORIES = [
  'FOOD', 'TRANSPORT', 'HOUSING', 'UTILITIES', 'ENTERTAINMENT', 'HEALTH', 'SHOPPING', 'SALARY', 'OTHER',
];

export const label = (c) => c.charAt(0) + c.slice(1).toLowerCase();

/** Used for both adding (initial = null) and editing (initial = existing transaction). */
export default function TransactionForm({ initial, defaultDate, onSave, onCancel }) {
  const [form, setForm] = useState({
    type: initial?.type ?? 'EXPENSE',
    category: initial?.category ?? 'FOOD',
    amount: initial?.amount ?? '',
    date: initial?.date ?? defaultDate,
    description: initial?.description ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        description: form.description.trim() || null,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="tx-form" onSubmit={submit}>
      <h3>{initial ? 'Edit transaction' : 'Add transaction'}</h3>
      {error && <div className="notice error">{error}</div>}

      <div className="form-grid">
        <label>
          Type
          <select value={form.type} onChange={set('type')}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </label>
        <label>
          Category
          <select value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{label(c)}</option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required />
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={set('date')} required />
        </label>
        <label className="span-2">
          Description (optional)
          <input type="text" maxLength={255} value={form.description} onChange={set('description')} />
        </label>
      </div>

      <div className="actions">
        <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
