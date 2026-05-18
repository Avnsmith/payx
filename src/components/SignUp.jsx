import React, { useState, useEffect } from 'react';
import { createDeveloperWallet, registerPasskeyWallet } from '../utils/wallet';
import { Wallet, ArrowRight, Loader2, Fingerprint } from 'lucide-react';

const SignUp = ({ onSignUp, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const walletData = await createDeveloperWallet(email);
      onSignUp(walletData);
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handlePasskeySignUp = async () => {
    setLoading(true);
    try {
      const walletData = await registerPasskeyWallet();
      onSignUp(walletData);
    } catch (err) {
      console.error("Passkey registration failed:", err);
      alert(err.message || "Passkey registration failed");
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
        <h2 className="mb-2">Create Account</h2>
        <p className="text-muted">Join PayX to get a secure Developer-Controlled Circle Wallet.</p>
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
            <><Loader2 className="spinner" size={20} /> Generating Wallet via Circle API...</>
          ) : (
            <>Sign Up <ArrowRight size={20} /></>
          )}
        </button>
        
        <div className="text-center my-6 text-muted text-sm font-semibold">OR</div>
        
        <button type="button" className="btn-secondary w-full" onClick={handlePasskeySignUp} disabled={loading} style={{ width: '100%' }}>
          <Fingerprint size={20} /> Sign up with Passkey
        </button>
      </form>

      <div className="text-center mt-6 text-sm">
        <span className="text-muted">Already have an account? </span>
        <button type="button" className="font-semibold text-accent" onClick={() => onNavigate('login')} style={{ textDecoration: 'underline' }}>
          Log In
        </button>
      </div>
    </div>
  );
};

export default SignUp;
