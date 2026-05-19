import React, { useState, useEffect, useRef } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import { Wallet, ArrowRight, Loader2, CheckCircle2, ShieldAlert, KeyRound, ShieldCheck, User } from 'lucide-react';

const appId = import.meta.env.NEXT_PUBLIC_CIRCLE_APP_ID;

const Auth = ({ onAuth }) => {
  const sdkRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [userId, setUserId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [step, setStep] = useState(1); // 1: User ID Entry, 2: Challenge Ready, 3: Success
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const [loginResult, setLoginResult] = useState(null); // { userToken, encryptionKey }
  const [challengeId, setChallengeId] = useState(null);

  // Initialize Circle Web3 SDK
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const sdk = new W3SSdk({
          appSettings: { appId }
        });

        sdkRef.current = sdk;
        if (active) {
          setSdkReady(true);
          
          // Get/generate Device ID
          let cachedId = localStorage.getItem("deviceId");
          if (!cachedId) {
            cachedId = await sdk.getDeviceId();
            localStorage.setItem("deviceId", cachedId);
          }
          setDeviceId(cachedId);
        }
      } catch (err) {
        console.error("Failed to initialize Circle SDK:", err);
        if (active) {
          setIsError(true);
          setStatus("Failed to initialize secure environment");
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  const handleAccessAccount = async (e) => {
    e.preventDefault();
    if (!userId || userId.length < 5 || !deviceId) {
      setIsError(true);
      setStatus("User ID must be at least 5 characters.");
      return;
    }

    setLoading(true);
    setIsError(false);
    setStatus("Establishing secure session...");

    try {
      // Step 1: Create user if they don't exist
      const createRes = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createUser",
          userId: userId.toLowerCase().trim()
        })
      });

      const createData = await createRes.json();
      // If code is NOT 155106 (already exists), and not ok, throw error
      if (!createRes.ok && createData.code !== 155106) {
        throw new Error(createData.message || "Failed to create user record");
      }

      // Step 2: Get user short-lived session token
      setStatus("Generating secure session tokens...");
      const tokenRes = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getUserToken",
          userId: userId.toLowerCase().trim()
        })
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(tokenData.message || "Failed to retrieve user token");
      }

      const userToken = tokenData.userToken;
      const encryptionKey = tokenData.encryptionKey;
      setLoginResult({ userToken, encryptionKey });

      // Step 3: Initialize user (to check if they need a wallet)
      setStatus("Syncing wallet status on Ethereum Sepolia...");
      const initRes = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initializeUser",
          userToken
        })
      });

      const initData = await initRes.json();

      if (!initRes.ok) {
        // If they are already initialized (code 155106), fetch existing wallet directly!
        if (initData.code === 155106) {
          await loadExistingWallets(userToken);
          return;
        }
        throw new Error(initData.message || "Initialization failed");
      }

      // If new user initialized successfully, we got a challengeId!
      setChallengeId(initData.challengeId);
      setStep(2);
      setStatus("Security PIN setup required for this new account.");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus(err.message || "Authentication process encountered an error.");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingWallets = async (userToken) => {
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "listWallets",
          userToken
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch wallets");

      const wallets = data.wallets || [];
      if (wallets.length > 0) {
        // Log them in!
        onAuth({
          walletId: wallets[0].id,
          address: wallets[0].address,
          userToken,
          encryptionKey: loginResult?.encryptionKey || '',
          email: userId // reuse userId as display name/identifier
        });
      } else {
        // This is extremely rare, but just in case
        setIsError(true);
        setStatus("No wallets found. Contact support.");
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus("Error loading wallets: " + err.message);
    }
  };

  const handleSetupPin = () => {
    if (!challengeId || !loginResult || !sdkRef.current) return;
    setLoading(true);
    setIsError(false);
    setStatus("Launching secure PIN configuration popup...");

    sdkRef.current.setAuthentication({
      userToken: loginResult.userToken,
      encryptionKey: loginResult.encryptionKey
    });

    sdkRef.current.execute(challengeId, async (error) => {
      if (error) {
        console.error("PIN Challenge failed:", error);
        setIsError(true);
        setStatus("PIN setup failed: " + error.message);
        setLoading(false);
        return;
      }

      // PIN setup completed successfully!
      setStatus("PIN configured successfully! Fetching your new Sepolia address...");
      await new Promise(r => setTimeout(r, 3500));
      await loadExistingWallets(loginResult.userToken);
    });
  };

  return (
    <div className="main-card glass-panel text-center">
      <div className="app-header" style={{ justifyContent: 'center' }}>
        <div className="logo" style={{ fontSize: '2rem' }}>
          <Wallet size={32} />
          PayX
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-2">User-Controlled PIN Wallet</h2>
        <p className="text-muted">Direct user-owned keys authorized by a secure 6-digit PIN.</p>
      </div>

      {step === 1 && (
        <form onSubmit={handleAccessAccount}>
          <div className="input-group">
            <label className="input-label">Username / User ID</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Enter unique username (min 5 chars)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={loading || !sdkReady}
                style={{ paddingLeft: '48px' }}
                minLength={5}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={loading || !sdkReady}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Accessing Secure Vault...</>
            ) : (
              <>Access Wallet <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      )}

      {step === 2 && (
        <div>
          <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-2xl border border-accent/10 mb-6">
            <KeyRound size={48} className="text-accent mb-3 spinner" />
            <h4 className="font-semibold text-lg mb-1">Set Authorization PIN</h4>
            <p className="text-sm text-muted">A hosted, secure window will guide you to set up your 6-digit PIN and Recovery Questions.</p>
          </div>

          <button className="btn-primary mt-4 w-full" onClick={handleSetupPin} disabled={loading}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Waiting for Setup...</>
            ) : (
              <>Configure Secure PIN</>
            )}
          </button>

          <button 
            className="btn-secondary mt-2 w-full" 
            onClick={() => setStep(1)} 
            disabled={loading}
          >
            Go Back
          </button>
        </div>
      )}

      {status && (
        <div className={`mt-6 text-sm p-4 rounded-xl border ${isError ? 'bg-rose-500/5 border-rose-500/10 text-rose-500' : 'bg-accent/5 border-accent/10 text-accent-light'}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default Auth;
