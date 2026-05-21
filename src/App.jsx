import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';
import ClaimLanding from './components/ClaimLanding';
import InvoiceCheckout from './components/InvoiceCheckout';

function App() {
  const [wallet, setWallet] = useState(null); // { walletId, address, userToken, encryptionKey, email, customApiKey, customAppId }
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('auth');
  const [claimId, setClaimId] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);

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

  // Restore authenticated session & handle routing on mount
  useEffect(() => {
    // 1. Detect session first
    let restoredWallet = null;
    try {
      const savedSession = localStorage.getItem("payx_current_wallet");
      if (savedSession) {
        const walletData = JSON.parse(savedSession);
        if (walletData && walletData.walletId && walletData.userToken) {
          setWallet(walletData);
          restoredWallet = walletData;
          fetchBalance(walletData.walletId, walletData.userToken, walletData.customApiKey);
        }
      }
    } catch (err) {
      console.error("Error restoring session:", err);
    }

    // 2. Parse client-side URL routing
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const invId = params.get('invoice');

    if (pathname.startsWith('/claim/')) {
      const id = pathname.split('/').pop();
      if (id) {
        setClaimId(id);
        setCurrentView('claim');
      }
    } else if (invId) {
      setInvoiceId(invId);
      setCurrentView('checkout');
    } else if (restoredWallet) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('auth');
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

  const handleBackToApp = () => {
    // Clean URL
    window.history.pushState({}, '', '/');
    setClaimId(null);
    setInvoiceId(null);
    if (wallet) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('auth');
    }
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
      ) : currentView === 'claim' ? (
        <ClaimLanding 
          claimId={claimId} 
          onBackToApp={handleBackToApp} 
        />
      ) : currentView === 'checkout' ? (
        <InvoiceCheckout 
          invoiceId={invoiceId} 
          wallet={wallet}
          onBackToApp={handleBackToApp} 
        />
      ) : null}
    </div>
  );
}

export default App;
