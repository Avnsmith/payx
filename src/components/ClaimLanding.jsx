import React, { useState, useEffect } from 'react';
import { Gift, ArrowRight, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';

const ClaimLanding = ({ claimId, onBackToApp }) => {
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [success, setSuccess] = useState(null); // { txHash, walletAddress }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/claims/${claimId}`);
        if (!res.ok) {
          throw new Error('Claim not found or expired.');
        }
        const data = await res.json();
        setClaim(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (claimId) {
      fetchClaim();
    }
  }, [claimId]);

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      alert('Please enter a valid Ethereum Sepolia wallet address.');
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claimId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddress.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim USDC.');
      }
      setSuccess({
        txHash: data.txHash,
        walletAddress: data.walletAddress
      });
      setClaim(prev => ({ ...prev, status: 'CLAIMED' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const copyTx = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="spinner text-accent mb-4" size={48} />
        <p className="text-muted">Fetching secure claim details...</p>
      </div>
    );
  }

  if (error && !claim) {
    return (
      <div className="main-card glass-panel text-center max-w-[480px] mx-auto">
        <AlertTriangle className="text-rose-500 mx-auto mb-4" size={48} />
        <h2 className="mb-2">Claim Error</h2>
        <p className="text-muted mb-6">{error}</p>
        <button className="btn-primary w-full" onClick={onBackToApp}>
          Go to PayX Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="main-card glass-panel max-w-[480px] mx-auto text-center" style={{ position: 'relative' }}>
      <div className="logo mb-6 justify-center">
        <Gift size={32} className="text-accent" />
        <span className="text-gradient font-bold" style={{ fontSize: '1.8rem' }}>ArcPay Claim Center</span>
      </div>

      {success ? (
        <div className="animate-scaleIn">
          <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto mb-4">
            <CheckCircle2 className="text-emerald-400" size={36} />
          </div>
          <h2 className="mb-2 text-emerald-400">USDC Claimed!</h2>
          <p className="text-muted mb-6">
            Your payment of <strong className="text-white">{claim.amount} USDC</strong> has been securely transferred to your wallet.
          </p>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-left mb-6 font-mono text-sm">
            <div className="mb-2">
              <span className="text-muted text-xs block">RECIPIENT ADDRESS</span>
              <span className="text-white text-xs truncate block">{success.walletAddress}</span>
            </div>
            <div>
              <span className="text-muted text-xs block">TRANSACTION HASH</span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-accent-light text-xs truncate block">{success.txHash}</span>
                <button 
                  onClick={() => copyTx(success.txHash)} 
                  className="btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  {copied ? <Check size={12} /> : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <a 
              href={`https://testnet.arcscan.app/tx/${success.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary w-full text-decoration-none flex justify-center items-center gap-2"
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <ExternalLink size={16} /> View on Arcscan
            </a>
            <button className="btn-secondary w-full" onClick={onBackToApp}>
              Go to PayX App
            </button>
          </div>
        </div>
      ) : claim.status === 'CLAIMED' ? (
        <div>
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="mb-2">Already Claimed</h2>
          <p className="text-muted mb-6">
            This claim of <strong className="text-white">{claim.amount} USDC</strong> has already been claimed and processed on-chain.
          </p>
          <button className="btn-primary w-full" onClick={onBackToApp}>
            Go to PayX App
          </button>
        </div>
      ) : (
        <div>
          <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 mb-6">
            <div className="text-sm text-muted font-semibold mb-1">YOU RECEIVED</div>
            <div className="text-4xl font-extrabold text-white mb-2">
              {claim.amount} <span className="text-accent text-2xl font-bold">USDC</span>
            </div>
            <div className="text-xs text-muted">
              Sent to: <span className="text-white font-medium">{claim.recipientEmail}</span>
            </div>
            {claim.message && (
              <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-left italic text-muted">
                "{claim.message}"
              </div>
            )}
          </div>

          <form onSubmit={handleClaim} className="text-left">
            <div className="input-group mb-6">
              <label className="input-label">Enter ERC20 Wallet Address</label>
              <input
                type="text"
                className="input-field font-mono text-sm"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                required
                disabled={claiming}
              />
              <p className="text-xs text-muted mt-2">
                Make sure to provide a valid Ethereum Sepolia / Arc Testnet address to receive your USDC.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={claiming || !walletAddress}>
              {claiming ? (
                <><Loader2 className="spinner mr-2" size={18} /> Processing on-chain payout...</>
              ) : (
                <>Claim USDC <ArrowRight size={18} className="ml-2" /></>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClaimLanding;
