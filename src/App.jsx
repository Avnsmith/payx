import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';
import History from './components/History';

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('login');

  const fetchBalance = async (walletId) => {
    try {
      const res = await fetch(`/api/get-balance?walletId=${walletId}`);
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const handleAuth = (walletData) => {
    setWallet(walletData);
    fetchBalance(walletData.walletId);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setWallet(null);
    setCurrentView('login');
  };

  useEffect(() => {
    if (wallet && currentView === 'dashboard') {
      const interval = setInterval(() => fetchBalance(wallet.walletId), 5000);
      return () => clearInterval(interval);
    }
  }, [wallet, currentView]);

  return (
    <div className="app-container">
      {currentView === 'login' ? (
        <Login onLogin={handleAuth} onNavigate={setCurrentView} />
      ) : currentView === 'signup' ? (
        <SignUp onSignUp={handleAuth} onNavigate={setCurrentView} />
      ) : currentView === 'dashboard' ? (
        <Dashboard 
          wallet={wallet} 
          balance={balance}
          setBalance={setBalance}
          onLogout={handleLogout} 
          onNavigate={setCurrentView}
        />
      ) : currentView === 'faucet' ? (
        <Faucet 
          wallet={wallet} 
          balance={balance}
          setBalance={setBalance}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : currentView === 'history' ? (
        <History
          accountId={wallet.walletId}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : null}
    </div>
  );
}

export default App;
