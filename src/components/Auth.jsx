import React, { useState, useEffect, useRef } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';
import { Wallet, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

const appId = import.meta.env.NEXT_PUBLIC_CIRCLE_APP_ID;

const Auth = ({ onAuth }) => {
  const sdkRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [email, setEmail] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP Sent, 3: Verified, 4: Wallet Creation
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  const [deviceToken, setDeviceToken] = useState('');
  const [deviceEncryptionKey, setDeviceEncryptionKey] = useState('');
  const [otpToken, setOtpToken] = useState('');
  
  const [loginResult, setLoginResult] = useState(null);
  const [challengeId, setChallengeId] = useState(null);

  // Initialize Circle Web3 SDK
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const onLoginComplete = (error, result) => {
          if (!active) return;
          if (error || !result) {
            console.error("Circle Authentication Error:", error);
            setIsError(true);
            setStatus(error?.message || "Email authentication failed.");
            setLoading(false);
            return;
          }

          // Success! We received the userToken and encryptionKey
          setLoginResult({
            userToken: result.userToken,
            encryptionKey: result.encryptionKey,
          });
          setIsError(false);
          setStatus("Email verified successfully!");
          setStep(3);
          setLoading(false);
        };

        const sdk = new W3SSdk(
          { appSettings: { appId } },
          onLoginComplete
        );

        sdkRef.current = sdk;
        setSdkReady(true);

        // Get or generate Device ID
        let cachedId = localStorage.getItem("deviceId");
        if (!cachedId) {
          cachedId = await sdk.getDeviceId();
          localStorage.setItem("deviceId", cachedId);
        }
        setDeviceId(cachedId);
      } catch (err) {
        console.error("Failed to initialize Circle SDK:", err);
        setIsError(true);
        setStatus("Failed to initialize secure environment");
      }
    };

    init();

    return () => {
      active = false;
    };
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email || !deviceId) return;

    setLoading(true);
    setIsError(false);
    setStatus("Requesting security passcode...");

    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestEmailOtp",
          deviceId,
          email: email.toLowerCase().trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to trigger security code");
      }

      setDeviceToken(data.deviceToken);
      setDeviceEncryptionKey(data.deviceEncryptionKey);
      setOtpToken(data.otpToken);

      // Configure SDK session
      sdkRef.current.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: data.deviceToken,
          deviceEncryptionKey: data.deviceEncryptionKey,
          otpToken: data.otpToken,
          email: { email: email.toLowerCase().trim() }
        }
      });

      setStep(2);
      setStatus("A one-time passcode was sent to your email!");
      setIsError(false);
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (!deviceToken || !deviceEncryptionKey || !otpToken) return;
    setIsError(false);
    setStatus("Opening secure verification...");
    setLoading(true);

    // Circle handles the secure hosted verification page
    sdkRef.current.verifyOtp();
  };

  const handleInitializeOrFetch = async () => {
    if (!loginResult?.userToken) return;
    setLoading(true);
    setIsError(false);
    setStatus("Syncing wallet details...");

    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initializeUser",
          userToken: loginResult.userToken
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Code 155106 means the user is already initialized!
        if (data.code === 155106) {
          await loadExistingWallets();
          return;
        }
        throw new Error(data.message || "Failed to initialize user");
      }

      // If user is new, we get a challengeId to execute wallet creation!
      setChallengeId(data.challengeId);
      setStep(4);
      setStatus("Security setup ready. Let's create your wallet!");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingWallets = async () => {
    try {
      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "listWallets",
          userToken: loginResult.userToken
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch wallets");

      const wallets = data.wallets || [];
      if (wallets.length > 0) {
        onAuth({
          walletId: wallets[0].id,
          address: wallets[0].address,
          userToken: loginResult.userToken,
          encryptionKey: loginResult.encryptionKey,
          email
        });
      } else {
        // Highly unlikely to have initialized user but 0 wallets
        setStatus("No wallets found. Initializing creation...");
        setStep(4);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatus(err.message);
    }
  };

  const handleCreateWallet = () => {
    if (!challengeId || !loginResult) return;
    setLoading(true);
    setIsError(false);
    setStatus("Executing secure wallet setup challenge...");

    sdkRef.current.setAuthentication({
      userToken: loginResult.userToken,
      encryptionKey: loginResult.encryptionKey
    });

    sdkRef.current.execute(challengeId, async (error) => {
      if (error) {
        console.error(error);
        setIsError(true);
        setStatus("Secure challenge execution failed: " + error.message);
        setLoading(false);
        return;
      }

      // Success! Give Circle indexer a few seconds to index the new wallet
      setStatus("Wallet created! Fetching your new address...");
      await new Promise(r => setTimeout(r, 3000));
      await loadExistingWallets();
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
        <h2 className="mb-2">Secure User Wallet</h2>
        <p className="text-muted">Circle User-Controlled Smart Wallet powered by Email OTP.</p>
      </div>

      {step === 1 && (
        <form onSubmit={handleRequestOtp}>
          <div className="input-group">
            <label className="input-label">Enter your Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !sdkReady}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary mt-6" disabled={loading || !sdkReady}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Requesting OTP...</>
            ) : (
              <>Send Verification Code <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      )}

      {step === 2 && (
        <div>
          <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-2xl border border-accent/10 mb-6">
            <Mail size={48} className="text-accent mb-3 spinner" />
            <h4 className="font-semibold text-lg mb-1">Check Your Inbox</h4>
            <p className="text-sm text-muted">We sent a security code to {email}</p>
          </div>

          <button className="btn-primary mt-4 w-full" onClick={handleVerifyOtp} disabled={loading}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Verifying...</>
            ) : (
              <>Verify Security Code</>
            )}
          </button>

          <button 
            className="btn-secondary mt-2 w-full" 
            onClick={() => setStep(1)} 
            disabled={loading}
          >
            Change Email
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mb-6">
            <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
            <h4 className="font-semibold text-lg mb-1">Authenticated!</h4>
            <p className="text-sm text-muted">Security verification complete.</p>
          </div>

          <button className="btn-primary mt-4 w-full" onClick={handleInitializeOrFetch} disabled={loading}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Syncing Wallets...</>
            ) : (
              <>Enter PayX Dashboard</>
            )}
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-2xl border border-accent/10 mb-6">
            <ShieldCheck size={48} className="text-accent mb-3" />
            <h4 className="font-semibold text-lg mb-1">Create Web3 Wallet</h4>
            <p className="text-sm text-muted">Let's generate your secure on-chain wallet.</p>
          </div>

          <button className="btn-primary mt-4 w-full" onClick={handleCreateWallet} disabled={loading}>
            {loading ? (
              <><Loader2 className="spinner" size={20} /> Configuring...</>
            ) : (
              <>Initialize Secure Wallet</>
            )}
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
