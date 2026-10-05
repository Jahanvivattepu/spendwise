```jsx
import { useState } from 'react';
import { api, setToken } from './api';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api(`/auth/${mode}`, { method: 'POST', body: { email, password } });
      setToken(res.token);
      onAuth();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <h1 className="brand">SpendWise</h1>
        <p className="muted">{isRegister ? 'Create your account' : 'Sign in to your account'}</p>

        {error && <div className="notice error">{error}</div>}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </label>
        {isRegister && <p className="muted small">At least 8 characters.</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Register' : 'Log in'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError('');
          }}
        >
          {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  );
}
