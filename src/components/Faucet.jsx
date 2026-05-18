import React, { useState } from 'react';
import { Droplet, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { addTransaction } from '../utils/db';

const Faucet = ({ wallet, balance, setBalance, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClaim = () => {
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      const newBalance = (parseFloat(balance) + 50).toFixed(2);
      setBalance(newBalance);
      
      addTransaction({
        accountId: wallet.accountId,
        type: 'receive',
        amount: '50.00',
        from: 'Arc Faucet',
        status: 'completed'
      });

      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="main-card glass-panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div className="app-header mb-6">
        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="font-semibold" style={{ fontSize: '1.25rem', flex: 1, textAlign: 'center', marginRight: '36px' }}>
          USDC Faucet
        </div>
      </div>

      <div className="text-center mb-8">
        <Droplet size={48} className="mx-auto mb-4" style={{ color: 'var(--accent)', display: 'block', margin: '0 auto 1rem auto' }} />
        <p className="text-muted">Claim 50.00 USDC to test the platform.</p>
      </div>

      <div className="balance-card mb-6 text-center" style={{ padding: '1.5rem' }}>
        <div className="text-muted font-semibold mb-2">Current Balance</div>
        <div className="balance-amount justify-center" style={{ justifyContent: 'center' }}>
          <span className="balance-currency">USDC</span>
          {balance}
        </div>
      </div>

      <button 
        className="btn-primary w-full" 
        onClick={handleClaim} 
        disabled={loading || success}
        style={{ width: '100%', padding: '1rem' }}
      >
        {loading ? (
          <><Loader2 className="spinner" size={20} /> Processing...</>
        ) : success ? (
          <><CheckCircle2 size={20} /> Tokens Sent!</>
        ) : (
          <><Droplet size={20} /> Claim 50 USDC</>
        )}
      </button>
    </div>
  );
};

export default Faucet;
