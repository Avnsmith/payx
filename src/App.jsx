import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';

function App() {
  const [wallet, setWallet] = useState(null); // { walletId, address, userToken, email }
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('auth');

  const fetchBalance = async (walletId, userToken) => {
    if (!walletId || !userToken) return;
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTokenBalance",
          userToken,
          walletId
        })
      });
      const data = await res.json();
      if (res.ok) {
        const balances = data.tokenBalances || [];
        const usdcEntry = balances.find(t => t.token.symbol === 'USDC' || t.token.name.includes('USDC'));
        setBalance(usdcEntry ? usdcEntry.amount : "0.00");
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const handleAuth = (walletData) => {
    setWallet(walletData);
    fetchBalance(walletData.walletId, walletData.userToken);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setWallet(null);
    setBalance("0.00");
    setCurrentView('auth');
  };

  useEffect(() => {
    if (wallet && currentView === 'dashboard') {
      const interval = setInterval(() => fetchBalance(wallet.walletId, wallet.userToken), 8000);
      return () => clearInterval(interval);
    }
  }, [wallet, currentView]);

  return (
    <div className="app-container">
      {currentView === 'auth' ? (
        <Auth onAuth={handleAuth} />
      ) : currentView === 'dashboard' ? (
        <Dashboard 
          wallet={wallet} 
          balance={balance}
          setBalance={setBalance}
          onLogout={handleLogout} 
          onNavigate={setCurrentView}
          fetchBalance={() => fetchBalance(wallet.walletId, wallet.userToken)}
        />
      ) : currentView === 'faucet' ? (
        <Faucet 
          wallet={wallet} 
          balance={balance}
          setBalance={setBalance}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : null}
    </div>
  );
}

export default App;
