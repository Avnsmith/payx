import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Faucet from './components/Faucet';
import History from './components/History';
import { initAppKit, publicClient } from './utils/wallet';
import { USDC_ADDRESS, USDC_ABI } from './utils/contracts';
import { formatUnits } from 'viem';

function App() {
  const [wallet, setWallet] = useState(null);
  const [appKit, setAppKit] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [currentView, setCurrentView] = useState('login');

  const fetchBalance = async (address) => {
    try {
      const data = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      setBalance(formatUnits(data, 6));
    } catch (err) {
      console.error("Error fetching balance", err);
    }
  };

  const handleAuth = (walletData) => {
    setWallet(walletData);
    fetchBalance(walletData.address);
    try {
      const { kit, adapter } = initAppKit(walletData);
      setAppKit({ kit, adapter });
      setCurrentView('dashboard');
    } catch (err) {
      console.error("Failed to initialize AppKit:", err);
    }
  };

  const handleLogout = () => {
    setWallet(null);
    setAppKit(null);
    setCurrentView('login');
  };

  // Poll for balance updates
  useEffect(() => {
    if (wallet && currentView === 'dashboard') {
      const interval = setInterval(() => fetchBalance(wallet.address), 3000);
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
          appKit={appKit} 
          balance={balance}
          refreshBalance={() => fetchBalance(wallet.address)}
          onLogout={handleLogout} 
          onNavigate={setCurrentView}
        />
      ) : currentView === 'faucet' ? (
        <Faucet 
          wallet={wallet} 
          balance={balance}
          refreshBalance={() => fetchBalance(wallet.address)}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : currentView === 'history' ? (
        <History
          address={wallet.address}
          onBack={() => setCurrentView('dashboard')}
        />
      ) : null}
    </div>
  );
}

export default App;
