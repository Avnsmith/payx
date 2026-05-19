import React, { useState } from 'react';
import { LogOut, Send, QrCode, Wallet, Users } from 'lucide-react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import SendModal from './SendModal';
import ReceiveModal from './ReceiveModal';

const appId = import.meta.env.NEXT_PUBLIC_CIRCLE_APP_ID;

const Dashboard = ({ wallet, balance, setBalance, onLogout, onNavigate, fetchBalance }) => {
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [friends] = useState([
    { name: 'Alice', address: '0x71C...976F' },
    { name: 'Bob', address: '0x39A...88D1' }
  ]);

  const handleSend = async (to, amount) => {
    let targetAddress = to.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      alert('Please enter a valid 0x address.');
      return false;
    }

    setSending(true);
    try {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createTransfer',
          userToken: wallet.userToken,
          walletId: wallet.walletId,
          destinationAddress: targetAddress,
          amount: amount.toString()
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create transfer challenge");

      const challengeId = data.challengeId;

      // Initialize SDK and run the challenge (PIN/OTP Verification)
      const sdk = new W3SSdk({
        appSettings: { appId }
      });

      sdk.setAuthentication({
        userToken: wallet.userToken,
        encryptionKey: wallet.encryptionKey
      });

      return new Promise((resolve) => {
        sdk.execute(challengeId, (error) => {
          setSending(false);
          if (error) {
            console.error("Execute transfer failed:", error);
            alert("Transfer failed: " + error.message);
            resolve(false);
            return;
          }

          alert("Transfer completed successfully! 🎉");
          setTimeout(() => {
            fetchBalance();
          }, 3000);
          resolve(true);
        });
      });
    } catch (err) {
      console.error(err);
      alert("Send failed: " + err.message);
      setSending(false);
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
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="balance-card animate-pulse-subtle">
        <div className="text-muted font-semibold">Total Balance</div>
        <div className="balance-amount">
          <span className="balance-currency">USDC</span>
          {balance}
        </div>
        <div className="text-sm text-muted">User-Controlled • {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</div>
      </div>

      <div className="action-buttons">
        <button className="btn-primary" onClick={() => setShowSendModal(true)} disabled={sending}>
          {sending ? 'Processing...' : <><Send size={18} /> Send</>}
        </button>
        <button className="btn-secondary" onClick={() => setShowReceiveModal(true)} disabled={sending}>
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
            <div key={i} className="friend-item" onClick={() => setShowSendModal(true)}>
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
