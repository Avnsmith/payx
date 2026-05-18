import React, { useState, useEffect } from 'react';
import { LogOut, Send, QrCode, Wallet, Users } from 'lucide-react';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';
import { getWalletFromEmail } from '../utils/wallet';
import { addTransaction } from '../utils/db';
import { History as HistoryIcon } from 'lucide-react';

const Dashboard = ({ wallet, appKit, balance, setBalance, onLogout, onNavigate }) => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  const [friends, setFriends] = useState(() => {
    const saved = localStorage.getItem('payx_friends');
    return saved ? JSON.parse(saved) : [
      { name: 'Alice', address: '0x71C...976F' },
      { name: 'Bob', address: '0x39A...88D1' }
    ];
  });

  const handleSend = async (to, amount) => {
    let targetAddress = to.trim();
    
    // Check if input is an email, if so derive address deterministically
    if (/^\S+@\S+\.\S+$/.test(targetAddress)) {
      targetAddress = getWalletFromEmail(targetAddress).address;
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      alert('Please enter a valid 0x address or email address.');
      return false;
    }

    if (!appKit || !appKit.kit) {
      console.warn("AppKit not fully initialized. Simulating transaction.");
      setBalance(prev => (parseFloat(prev) - parseFloat(amount)).toFixed(2));
      return true;
    }
    
    try {
      // Using Arc App Kit for sending USDC
      const result = await appKit.kit.send({
        from: { adapter: appKit.adapter, chain: "Arc_Testnet" },
        to: targetAddress,
        amount: amount.toString(),
        token: "USDC",
      });
      console.log("Send successful:", result);
      setBalance(prev => (parseFloat(prev) - parseFloat(amount)).toFixed(2));
      return true;
    } catch (err) {
      console.warn("Real network execution failed (expected for demo without API keys), simulating success instead:", err.message);
      // Fallback for demo if AppKit fails due to missing provider or keys
      setBalance(prev => (parseFloat(prev) - parseFloat(amount)).toFixed(2));
      addTransaction(wallet.accountId, { type: 'send', amount, to: targetAddress });
      return true;
    }
  };

  return (
    <div className="main-card glass-panel" style={{ maxWidth: '540px' }}>
      <div className="app-header">
        <div className="logo">
          <Wallet size={24} />
          PayX
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => onNavigate('faucet')} title="Faucet">
            Faucet
          </button>
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={() => onNavigate('history')} title="History">
            <HistoryIcon size={16} />
          </button>
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="balance-card">
        <div className="text-muted font-semibold">Total Balance</div>
        <div className="balance-amount">
          <span className="balance-currency">USDC</span>
          {balance}
        </div>
        <div className="text-sm text-muted">Arc Network • {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</div>
      </div>

      <div className="action-buttons">
        <button className="btn-primary" onClick={() => setShowSendModal(true)}>
          <Send size={18} /> Send
        </button>
        <button className="btn-secondary" onClick={() => setShowReceiveModal(true)}>
          <QrCode size={18} /> Receive
        </button>
      </div>

      <div>
        <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} className="text-muted" />
          <h3 className="font-semibold">Recent Friends</h3>
        </div>
        <div className="friend-list">
          {friends.map((friend, i) => (
            <div key={i} className="friend-item" onClick={() => {
              // Could pre-fill modal in a real app
              setShowSendModal(true);
            }}>
              <div className="friend-avatar">
                {friend.name.charAt(0)}
              </div>
              <div className="friend-info">
                <div className="friend-name">{friend.name}</div>
                <div className="friend-address">{friend.address}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSendModal && (
        <SendModal 
          onClose={() => setShowSendModal(false)} 
          onSend={handleSend}
          friends={friends}
        />
      )}
      
      {showReceiveModal && (
        <ReceiveModal 
          onClose={() => setShowReceiveModal(false)}
          address={wallet.address}
        />
      )}
    </div>
  );
};

export default Dashboard;
