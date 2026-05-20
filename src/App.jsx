import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';

function App() {
  const [wallet, setWallet] = useState(null); // { walletId, address, userToken, encryptionKey, email, customApiKey, customAppId }
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('auth');

  const fetchBalance = async (walletId, userToken, customApiKey) => {
    if (!walletId || !userToken) return;
    try {
      const activeApiKey = customApiKey || wallet?.customApiKey || localStorage.getItem("payx_custom_api_key");
      const headers = { "Content-Type": "application/json" };
      if (activeApiKey) {
        headers["x-circle-api-key"] = activeApiKey;
      }

      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "getTokenBalance",
          userToken,
          walletId
        })
      });
      const data = await res.json();
      if (res.ok) {
        const balances = data.tokenBalances || [];
        const usdcEntry = balances.find(
          t => t.token.tokenAddress?.toLowerCase() === '0x3600000000000000000000000000000000000000' ||
               t.token.symbol === 'USDC' ||
               t.token.name.includes('USDC')
        );
        setBalance(usdcEntry ? usdcEntry.amount : "0.00");
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  // Restore authenticated session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("payx_current_wallet");
      if (savedSession) {
        const walletData = JSON.parse(savedSession);
        if (walletData && walletData.walletId && walletData.userToken) {
          setWallet(walletData);
          setCurrentView('dashboard');
          fetchBalance(walletData.walletId, walletData.userToken, walletData.customApiKey);
        }
      }
    } catch (err) {
      console.error("Error restoring session:", err);
    }
  }, []);

  const handleAuth = (walletData) => {
    setWallet(walletData);
    localStorage.setItem("payx_current_wallet", JSON.stringify(walletData));
    fetchBalance(walletData.walletId, walletData.userToken, walletData.customApiKey);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setWallet(null);
    setBalance("0.00");
    localStorage.removeItem("payx_current_wallet");
    setCurrentView('auth');
  };

  // Poll balance updates while on the dashboard
  useEffect(() => {
    if (wallet && currentView === 'dashboard') {
      const interval = setInterval(() => {
        fetchBalance(wallet.walletId, wallet.userToken, wallet.customApiKey);
      }, 8000);
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
          fetchBalance={() => fetchBalance(wallet.walletId, wallet.userToken, wallet.customApiKey)}
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
