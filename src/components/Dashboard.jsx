import React, { useState, useEffect } from 'react';
import { LogOut, Send, QrCode, Wallet, Users } from 'lucide-react';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';
import { getWalletFromEmail, publicClient } from '../utils/wallet';
import { USDC_ADDRESS, USDC_ABI } from '../utils/contracts';
import { History as HistoryIcon } from 'lucide-react';
import { parseUnits } from 'viem';

const Dashboard = ({ wallet, appKit, balance, refreshBalance, onLogout, onNavigate }) => {
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

    try {
      const amountUnits = parseUnits(amount.toString(), 6);
      
      const { request } = await publicClient.simulateContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [targetAddress, amountUnits],
        account: wallet.account
      });

      const hash = await wallet.client.writeContract(request);
      console.log("Transaction Hash:", hash);
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      
      // Add local history reference since indexing takes time on real nets
      const txs = JSON.parse(localStorage.getItem('payx_real_txs') || '[]');
      txs.unshift({ id: hash, type: 'send', amount, to: targetAddress, timestamp: new Date().toISOString(), from: wallet.address });
      localStorage.setItem('payx_real_txs', JSON.stringify(txs));

      refreshBalance();
      return true;
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send transaction: " + err.message);
      return false;
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
        <div className="text-sm text-muted">Local Hardhat • {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</div>
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
