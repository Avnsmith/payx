import React, { useState, useEffect, useRef } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import { Wallet, ArrowRight, Loader2, KeyRound, User, UserPlus, LogIn } from 'lucide-react';

const appId = import.meta.env.NEXT_PUBLIC_CIRCLE_APP_ID;

const Auth = ({ onAuth }) => {
  const sdkRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'
  const [userId, setUserId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [step, setStep] = useState(1); // 1: Form Entry, 2: PIN Setup, 3: Loading/Success
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const [loginResult, setLoginResult] = useState(null); // { userToken, encryptionKey }
  const [challengeId, setChallengeId] = useState(null);

  // Initialize Circle Web3 SDK on mount
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
          
          // Get/generate Device ID for security
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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!userId || userId.length < 5 || !deviceId) {
      setIsError(true);
      setStatus("User ID must be at least 5 characters.");
      return;
    }

    setLoading(true);
    setIsError(false);
    setStatus(activeTab === 'signup' ? "Creating your secure wallet vault..." : "Locating your account...");

    try {
      const formattedUserId = userId.toLowerCase().trim();

      if (activeTab === 'signup') {
        // --- SIGN UP FLOW ---
        // 1. Create a new user record on Circle backend
        const createRes = await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createUser",
            userId: formattedUserId
          })
        });

        const createData = await createRes.json();
        
        if (!createRes.ok) {
          if (createData.code === 155106 || createData.message?.includes("already exists")) {
            throw new Error("This username is already taken. Please go to the Sign In tab!");
          }
          throw new Error(createData.message || "Failed to create user record");
        }

        // 2. Fetch session tokens
        setStatus("Generating secure registration tokens...");
        const tokenRes = await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getUserToken",
            userId: formattedUserId
          })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.message || "Failed to retrieve session tokens");

        setLoginResult({ userToken: tokenData.userToken, encryptionKey: tokenData.encryptionKey });

        // 3. Initialize User to trigger PIN challenge
        setStatus("Preparing secure PIN initialization challenge...");
        const initRes = await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "initializeUser",
            userToken: tokenData.userToken
          })
        });

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.message || "Failed to prepare setup challenge");

        setChallengeId(initData.challengeId);
        setStep(2);
        setStatus("Launch PIN setup below to secure your wallet.");
      } else {
        // --- SIGN IN FLOW ---
        // 1. Try to fetch token directly (will error if user does not exist)
        const tokenRes = await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getUserToken",
            userId: formattedUserId
          })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          throw new Error("Username not found. Switch to the Sign Up tab to create it!");
        }

        setLoginResult({ userToken: tokenData.userToken, encryptionKey: tokenData.encryptionKey });

        // 2. Initialize or fetch existing wallet
        setStatus("Verifying secure security parameters...");
        const initRes = await fetch("/api/endpoints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "initializeUser",
            userToken: tokenData.userToken
          })
        });

        const initData = await initRes.json();

        if (!initRes.ok) {
          // 155106 means they are already initialized (wallet setup complete!) -> Load wallets directly!
          if (initData.code === 155106) {
            setStatus("Loading secure smart wallet...");
            await loadExistingWallets(tokenData.userToken, tokenData.encryptionKey);
            return;
          }
          throw new Error(initData.message || "Authentication failed");
        }

        // If they registered but never completed the challenge setup (rare)
        setChallengeId(initData.challengeId);
        setStep(2);
        setStatus("You registered but didn't finish PIN setup. Configure it now!");
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadExistingWallets = async (userToken, encryptionKey) => {
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
        onAuth({
          walletId: wallets[0].id,
          address: wallets[0].address,
          userToken,
          encryptionKey,
          email: userId.toLowerCase().trim()
        });
      } else {
        setIsError(true);
        setStatus("Secure wallet configuration in progress. Try again in a few seconds.");
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
    setStatus("Launching secure hosted Circle setup window...");

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

      setStatus("PIN configured successfully! Spawning your wallet address on Ethereum Sepolia...");
      await new Promise(r => setTimeout(r, 3500));
      await loadExistingWallets(loginResult.userToken, loginResult.encryptionKey);
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
        <>
          {/* TAB SELECTOR */}
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 mb-6" style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                setActiveTab('signin');
                setStatus('');
                setIsError(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'signin' ? 'var(--accent)' : 'transparent',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setStatus('');
                setIsError(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'signup' ? 'var(--accent)' : 'transparent',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              <UserPlus size={16} /> Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            <div className="input-group">
              <label className="input-label">
                {activeTab === 'signin' ? 'Your Username / User ID' : 'Create Username / User ID'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  placeholder={activeTab === 'signin' ? "Enter your username" : "Choose unique username (min 5 chars)"}
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
                <><Loader2 className="spinner" size={20} /> Securing vault...</>
              ) : activeTab === 'signin' ? (
                <>Sign In <ArrowRight size={20} /></>
              ) : (
                <>Create Wallet <ArrowRight size={20} /></>
              )}
            </button>
          </form>
        </>
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
              <><Loader2 className="spinner" size={20} /> Launching Secure Window...</>
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
