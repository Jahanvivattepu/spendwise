```jsx
import { useEffect, useState } from 'react';
import { clearToken, getToken } from './api';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [token, setToken] = useState(getToken());

  useEffect(() => {
    const onLogout = () => setToken(null);
    window.addEventListener('spendwise-logout', onLogout);
    return () => window.removeEventListener('spendwise-logout', onLogout);
  }, []);

  if (!token) {
    return <Login onAuth={() => setToken(getToken())} />;
  }

  return (
    <Dashboard
      onLogout={() => {
        clearToken();
        setToken(null);
      }}
    />
  );
}
