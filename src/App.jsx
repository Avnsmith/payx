import React, { useState } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';
import History from './components/History';
import { initAppKit } from './utils/wallet';
import { getBalance, updateBalance } from './utils/db';

function App() {
  const [wallet, setWallet] = useState(null);
  const [appKit, setAppKit] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('login');

  const handleAuth = (walletData) => {
    setWallet(walletData);
    if (walletData.accountId) {
      setBalance(getBalance(walletData.accountId));
    }
    try {
      const { kit, adapter } = initAppKit(walletData);
      setAppKit({ kit, adapter });
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Failed to initialize AppKit:", err);
      // Fallback allowed for demo
      setCurrentView('dashboard');
    }
  };

  const handleSetBalance = (newBalanceOrFn) => {
    setBalance(prev => {
      const updated = typeof newBalanceOrFn === 'function' ? newBalanceOrFn(prev) : newBalanceOrFn;
      if (wallet && wallet.accountId) {
        updateBalance(wallet.accountId, updated);
      }
      return updated;
    });
  };

  const handleLogout = () => {
    setWallet(null);
    setAppKit(null);
    setCurrentView('login');
  };

  return (
    <div className="app-container">
      {currentView === 'login' ? (
        <Login onLogin={handleAuth} onNavigate={setCurrentView} />
      ) : currentView === 'signup' ? (
        <SignUp onSignUp={handleAuth} onNavigate={setCurrentView} />
      ) : currentView === 'dashboard' ? (
        <Dashboard 
          wallet={wallet} 
          appKit={appKit} 
          balance={balance}
          setBalance={handleSetBalance}
          onLogout={handleLogout} 
          onNavigate={setCurrentView}
        />
      ) : currentView === 'faucet' ? (
        <Faucet 
          wallet={wallet} 
          balance={balance}
          setBalance={handleSetBalance}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : currentView === 'history' ? (
        <History
          accountId={wallet.accountId}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : null}
    </div>
  );
}

export default App;
