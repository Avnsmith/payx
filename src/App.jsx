import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';
import { initAppKit } from './utils/wallet';

function App() {
  const [wallet, setWallet] = useState(null);
  const [appKit, setAppKit] = useState(null);
  const [balance, setBalance] = useState("100.00");
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLogin = (walletData) => {
    setWallet(walletData);
    try {
      const { kit, adapter } = initAppKit(walletData);
      setAppKit({ kit, adapter });
    } catch (err) {
      console.error("Failed to initialize AppKit:", err);
      // fallback if AppKit fails to init in test env
    }
  };

  const handleLogout = () => {
    setWallet(null);
    setAppKit(null);
    setCurrentView('dashboard');
  };

  return (
    <div className="app-container">
      {!wallet ? (
        <Login onLogin={handleLogin} />
      ) : currentView === 'dashboard' ? (
        <Dashboard 
          wallet={wallet} 
          appKit={appKit} 
          balance={balance}
          setBalance={setBalance}
          onLogout={handleLogout} 
          onNavigate={setCurrentView}
        />
      ) : (
        <Faucet 
          wallet={wallet} 
          balance={balance}
          setBalance={setBalance}
          onBack={() => setCurrentView('dashboard')}
        />
      )}
    </div>
  );
}

export default App;
