import React from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';

const ReceiveModal = ({ onClose, address }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ padding: '2rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '1rem' }}>
          <h3 className="font-semibold" style={{ fontSize: '1.25rem', textAlign: 'left' }}>Receive USDC</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-6 mt-4" style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block' }}>
          {/* Simple CSS placeholder for QR since we don't have a library installed */}
          <div style={{ width: '180px', height: '180px', background: `repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)`, opacity: 0.8, borderRadius: '8px' }}></div>
        </div>
        
        <p className="text-muted mb-4 font-semibold">Your Arc Network Address</p>
        
        <div className="input-field mb-6" style={{ background: 'rgba(0,0,0,0.4)', wordBreak: 'break-all', fontSize: '0.875rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          {address}
        </div>
        
        <button className="btn-secondary" onClick={copyToClipboard} style={{ width: '100%' }}>
          {copied ? <><CheckCircle2 size={18} className="text-success" /> Copied!</> : <><Copy size={18} /> Copy Address</>}
        </button>
      </div>
    </div>
  );
};

export default ReceiveModal;
