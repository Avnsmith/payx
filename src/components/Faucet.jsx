import React, { useState } from 'react';
import { Droplet, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { addTransaction } from '../utils/db';

const Faucet = ({ wallet, balance, setBalance, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClaim = () => {
    setLoading(true);
    setSuccess(false);
    
    // Simulate network request to Arc Faucet
    setTimeout(() => {
      setBalance(prev => (parseFloat(prev) + 50.00).toFixed(2));
      addTransaction(wallet.accountId, { type: 'receive', amount: '50.00', from: 'Arc Faucet' });
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="main-card glass-panel" style={{ maxWidth: '480px' }}>
      <div className="app-header mb-6">
        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="font-semibold" style={{ fontSize: '1.25rem', flex: 1, textAlign: 'center', marginRight: '36px' }}>
          USDC Faucet
        </div>
      </div>

      <div className="text-center mb-6">
        <div style={{ 
          width: '64px', height: '64px', 
          background: 'var(--accent-gradient)', 
          borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          color: 'white',
          boxShadow: '0 4px 15px rgba(96, 165, 250, 0.4)'
        }}>
          <Droplet size={32} />
        </div>
        <h2 className="mb-2">Get Test USDC</h2>
        <p className="text-muted text-sm">
          Claim 50.00 USDC to your Arc Network address. You can request funds once every 24 hours.
        </p>
      </div>

      <div className="balance-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="text-sm text-muted mb-1 font-semibold">Your Address</div>
        <div className="font-semibold text-sm mb-4" style={{ wordBreak: 'break-all' }}>{wallet.address}</div>
        
        <div className="text-sm text-muted mb-1 font-semibold">Current Balance</div>
        <div className="font-semibold" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{balance} USDC</div>
      </div>

      <button className="btn-primary" onClick={handleClaim} disabled={loading || success}>
        {loading ? (
          <><Loader2 className="spinner" size={18} /> Requesting Funds...</>
        ) : success ? (
          <><CheckCircle2 size={18} /> Funds Added!</>
        ) : (
          <><Droplet size={18} /> Claim 50 USDC</>
        )}
      </button>
    </div>
  );
};

export default Faucet;
