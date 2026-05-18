import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

const SendModal = ({ onClose, onSend, friends }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;
    
    setLoading(true);
    // Add artificial delay for UI feel
    setTimeout(async () => {
      const success = await onSend(recipient, amount);
      setLoading(false);
      if (success) {
        onClose();
      }
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold" style={{ fontSize: '1.25rem' }}>Send USDC</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">To (Address or Email)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="0x... or name@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Amount (USDC)</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              className="input-field" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading}
            />
            <div className="text-xs text-muted mt-2" style={{ color: 'var(--success)' }}>
              ✓ Network fee sponsored
            </div>
          </div>
          
          <button type="submit" className="btn-primary mt-6" disabled={loading}>
            {loading ? (
              <><Loader2 className="spinner" size={18} /> Processing on Arc...</>
            ) : (
              <><Send size={18} /> Send Payment</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SendModal;
