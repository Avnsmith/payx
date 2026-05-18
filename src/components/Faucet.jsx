import React from 'react';
import { Droplet, ArrowLeft, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';

const Faucet = ({ wallet, balance, onBack }) => {
  const [copied, setCopied] = React.useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <p className="text-muted mb-4">Because you are using a secure Developer-Controlled Circle Wallet on the public testnet, you need real testnet USDC from the official Circle Faucet.</p>
        
        <div className="p-4 mb-4" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', wordBreak: 'break-all' }}>
          <div className="text-sm text-muted mb-1">Your Wallet Address:</div>
          <div className="font-mono text-sm mb-2">{wallet.address}</div>
          <button className="btn-secondary w-full" onClick={copyAddress} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Address</>}
          </button>
        </div>
      </div>

      <a 
        href="https://faucet.circle.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="btn-primary w-full" 
        style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
      >
        <ExternalLink size={20} /> Open Circle Faucet
      </a>
      <p className="text-center text-xs text-muted mt-4">
        Paste your address into the Circle Faucet, select "Ethereum Sepolia" and "USDC" to receive funds.
      </p>
    </div>
  );
};

export default Faucet;
