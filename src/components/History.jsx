import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const History = ({ address, onBack }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // In a real app we'd use an indexer. Here we fallback to local logs of real on-chain tx hashes
    const txs = JSON.parse(localStorage.getItem('payx_real_txs') || '[]');
    // filter for this specific wallet
    const myTxs = txs.filter(tx => tx.from === address || tx.to === address);
    setTransactions(myTxs);
  }, [address]);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="main-card glass-panel" style={{ maxWidth: '540px' }}>
      <div className="app-header mb-6">
        <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="font-semibold" style={{ fontSize: '1.25rem', flex: 1, textAlign: 'center', marginRight: '36px' }}>
          Transaction History
        </div>
      </div>

      <div className="friend-list">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <Clock size={48} className="mx-auto mb-4 opacity-50" style={{ display: 'block', margin: '0 auto 1rem auto' }} />
            <p>No transactions found on-chain for this wallet.</p>
          </div>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="friend-item" style={{ cursor: 'default' }}>
              <div className="friend-avatar" style={{ 
                background: tx.type === 'receive' ? 'var(--success)' : 'var(--accent)',
                opacity: 0.9
              }}>
                {tx.type === 'receive' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
              </div>
              <div className="friend-info">
                <div className="friend-name" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{tx.type === 'receive' ? 'Received USDC' : 'Sent USDC'}</span>
                  <span style={{ color: tx.type === 'receive' ? 'var(--success)' : 'var(--text-primary)' }}>
                    {tx.type === 'receive' ? '+' : '-'}{tx.amount}
                  </span>
                </div>
                <div className="friend-address" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{tx.type === 'receive' ? 'From: ' + tx.from : 'To: ' + tx.to}</span>
                  <span>{formatDate(tx.timestamp)}</span>
                </div>
                <div className="text-xs text-muted mt-1" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>
                  Tx: {tx.id}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
