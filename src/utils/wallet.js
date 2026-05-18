// This file now interacts with our Vercel Serverless Functions
// which securely hold the Circle API keys.

export const createDeveloperWallet = async (email) => {
  try {
    const res = await fetch('/api/create-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase() })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create developer wallet.");
    
    return {
      walletId: data.walletId,
      address: data.address,
      type: 'email'
    };
  } catch (err) {
    console.error("Wallet Creation Error:", err);
    throw err;
  }
};

export const getDeveloperWallet = async (email) => {
  try {
    const res = await fetch('/api/get-wallets');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch wallets.");

    // In a production app, we would search our secure database or use Circle's tags
    // Here we assume the frontend is tracking the mapping or we return the latest for demo
    const wallet = data.wallets.find(w => true); // Simplification for demo
    
    if (!wallet) throw new Error("No wallets found. Please sign up.");
    
    return {
      walletId: wallet.id,
      address: wallet.address,
      type: 'email'
    };
  } catch (err) {
    console.error("Wallet Fetch Error:", err);
    throw err;
  }
};

export const registerPasskeyWallet = async () => {
  // Passkey frontend registration remains the same UX, 
  // but we map it to a new Developer Wallet backend call.
  if (!window.PublicKeyCredential) throw new Error("WebAuthn is not supported.");
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "PayX Arc Wallet", id: window.location.hostname },
      user: { id: userId, name: "user@payx.local", displayName: "PayX Passkey User" },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: { authenticatorAttachment: "platform" },
      timeout: 60000,
      attestation: "none"
    }
  });

  if (!credential) throw new Error("Passkey creation failed.");
  
  return await createDeveloperWallet(credential.id); // Use credential ID as the identifier
};

export const loginWithPasskey = async () => {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn is not supported.");
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credential = await navigator.credentials.get({
    publicKey: { challenge, rpId: window.location.hostname, userVerification: "required", timeout: 60000 }
  });

  if (!credential) throw new Error("Passkey login failed.");
  
  return await getDeveloperWallet(credential.id);
};
