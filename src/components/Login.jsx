import React, { useState } from 'react';
import { getWalletFromEmail, getWalletFromPasskey } from '../utils/wallet';
import { Wallet, ArrowRight, Loader2, Fingerprint } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    // Simulate network delay for realistic feel
    setTimeout(() => {
      try {
        const walletData = getWalletFromEmail(email);
        onLogin(walletData);
      } catch (err) {
        console.error("Login failed:", err);
        setLoading(false);
      }
    }, 1500);
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      const walletData = await getWalletFromPasskey();
      onLogin(walletData);
    } catch (err) {
      console.error("Passkey login failed:", err);
      alert(err.message || "Passkey login failed");
      setLoading(false);
    }
  };

  return (
    <div className="main-card glass-panel">
      <div className="app-header" style={{ justifyContent: 'center' }}>
        <div className="logo" style={{ fontSize: '2rem' }}>
          <Wallet size={32} />
          PayX
        </div>
      </div>
      
      <div className="text-center mb-6">
        <h2 className="mb-2">Welcome Back</h2>
        <p className="text-muted">Sign in with your email to access your Arc Network wallet.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label">Email Address</label>
          <input 
            type="email" 
            className="input-field" 
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        
        <button type="submit" className="btn-primary mt-6" disabled={loading}>
          {loading ? (
            <><Loader2 className="spinner" size={20} /> Accessing Wallet...</>
          ) : (
            <>Continue <ArrowRight size={20} /></>
          )}
        </button>
        
        <div className="text-center my-6 text-muted text-sm font-semibold">OR</div>
        
        <button type="button" className="btn-secondary w-full" onClick={handlePasskeyLogin} disabled={loading} style={{ width: '100%' }}>
          <Fingerprint size={20} /> Sign in with Passkey
        </button>
      </form>
    </div>
  );
};

export default Login;
