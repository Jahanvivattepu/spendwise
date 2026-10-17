import React, { useState } from 'react';

export default function SettingsView({
  currentUser,
  monthlyBudget,
  onUpdateBudget,
  token,
  onLogout
}) {
  const [budgetInput, setBudgetInput] = useState(monthlyBudget);
  const [budgetSuccess, setBudgetSuccess] = useState('');
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

 const handleBudgetSave = async (e) => {
    e.preventDefault();
    const val = Number(budgetInput);
    if (!val || val <= 0) return;

    try {
      const res = await fetch('/api/users/budget', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ monthlyBudget: val })
      });

      if (res.ok) {
        onUpdateBudget(val);
        setBudgetSuccess('Monthly budget limit updated and saved to database!');
        setTimeout(() => setBudgetSuccess(''), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to update budget on server.');
      }
    } catch (err) {
      console.error('Failed to persist budget:', err);
      alert('Network error while saving budget.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password successfully changed!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Account Info Card */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>Account Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <div style={readOnlyValStyle}>{currentUser}</div>
          </div>
          <div>
            <label style={labelStyle}>ACCOUNT STATUS</label>
            <div style={{ ...readOnlyValStyle, color: '#10b981', fontWeight: '700' }}>● Active & Secured</div>
          </div>
          <div>
            <label style={labelStyle}>CURRENT MONTHLY TARGET</label>
            <div style={readOnlyValStyle}>₹{Number(monthlyBudget).toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Preferences */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>Monthly Budget Target</h3>
        <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
          Adjust your default monthly expenditure runway limit. This value is used by the velocity gauge and affordability advisor.
        </p>

        {budgetSuccess && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {budgetSuccess}
          </div>
        )}

        <form onSubmit={handleBudgetSave} style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b', fontWeight: '700' }}>₹</span>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              required
              min="1"
              style={{ ...inputStyle, paddingLeft: '28px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Update Target
          </button>
        </form>
      </div>

      {/* Security & Password Settings */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>Security Settings</h3>
        <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
          Update your account authentication credentials.
        </p>

        {passwordMsg.text && (
          <div style={{
            backgroundColor: passwordMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${passwordMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: passwordMsg.type === 'success' ? '#065f46' : '#991b1b',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '14px'
          }}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <div>
            <label style={labelStyle}>CURRENT PASSWORD</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>NEW PASSWORD</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            style={{
              marginTop: '4px',
              padding: '10px 18px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {isUpdatingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Session Management */}
      <div style={{ ...cardStyle, border: '1px solid #fee2e2', backgroundColor: '#fffaf0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#991b1b' }}>Session Termination</h3>
        <p style={{ margin: '0 0 16px 0', color: '#7f1d1d', fontSize: '13px' }}>
          End your active SpendWise session and clear all local access credentials.
        </p>
        <button
          onClick={onLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Sign Out of SpendWise
        </button>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e2e8f0'
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '700',
  color: '#64748b',
  marginBottom: '6px'
};

const readOnlyValStyle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#1e293b',
  backgroundColor: '#f8fafc',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #cbd5e1',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};