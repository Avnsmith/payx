import React, { useState } from 'react';
import { getWalletFromEmail, registerPasskeyWallet } from '../utils/wallet';
import { registerUser, getUser } from '../utils/db';
import { Wallet, ArrowRight, Loader2, Fingerprint } from 'lucide-react';

const SignUp = ({ onSignUp, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const existing = getUser(email.toLowerCase());
      if (existing) throw new Error("Email already registered. Please sign in.");

      const walletData = getWalletFromEmail(email);
      const accountId = registerUser(email.toLowerCase(), 'email');
      
      setTimeout(() => {
        onSignUp({ ...walletData, accountId });
      }, 1000);
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handlePasskeySignUp = async () => {
    setLoading(true);
    try {
      const walletData = await registerPasskeyWallet();
      
      const existing = getUser(walletData.passkeyId);
      if (existing) throw new Error("Passkey already registered. Please sign in.");

      const accountId = registerUser(walletData.passkeyId, 'passkey');
      
      onSignUp({ ...walletData, accountId });
    } catch (err) {
      console.error("Passkey registration failed:", err);
      alert(err.message || "Passkey registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="main-card glass-panel">
      <div className="app-header" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
        <div className="logo" style={{ fontSize: '2rem' }}>
          <Wallet size={32} />
          PayX
        </div>
      </div>
      
      <div className="text-center mb-6">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Create Account</h2>
        <p className="text-muted">Join PayX on the Arc Network</p>
      </div>

      <form onSubmit={handleEmailSignUp}>
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
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            <><Loader2 className="spinner" size={20} /> Creating...</>
          ) : (
            <>Sign Up <ArrowRight size={20} /></>
          )}
        </button>
        
        <div className="text-center my-6 text-muted text-sm font-semibold">OR</div>
        
        <button type="button" className="btn-secondary w-full" onClick={handlePasskeySignUp} disabled={loading} style={{ width: '100%' }}>
          <Fingerprint size={20} /> Register with Passkey
        </button>
      </form>

      <div className="text-center mt-6 text-sm">
        <span className="text-muted">Already have an account? </span>
        <button type="button" className="font-semibold text-accent" onClick={() => onNavigate('login')} style={{ textDecoration: 'underline' }}>
          Sign In
        </button>
      </div>
    </div>
  );
};

export default SignUp;
