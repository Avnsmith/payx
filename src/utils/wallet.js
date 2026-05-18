import { ethers } from 'ethers';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { AppKit } from '@circle-fin/app-kit';

export const arcTestnet = {
  id: 984122,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.arc.network/rpc'] },
    public: { http: ['https://testnet.arc.network/rpc'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
};

// Deterministically generate a private key using a hash
const getWalletForIdentifier = (identifier) => {
  // Use a simple hash of the identifier to generate a consistent private key
  const hash = ethers.id(identifier);
  // Ensure the hash is exactly 32 bytes (64 hex chars)
  const paddedHash = ethers.zeroPadValue(hash, 32);
  const wallet = new ethers.Wallet(paddedHash);
  return wallet.privateKey;
};

export const getWalletFromEmail = (email) => {
  const privateKey = getWalletForIdentifier(email.toLowerCase());
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http()
  });

  return {
    account,
    client,
    address: account.address,
    privateKey,
    type: 'email'
  };
};

export const registerPasskeyWallet = async () => {
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn is not supported in this browser.");
  }
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: {
          name: "PayX Arc Wallet",
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: "user@payx.local",
          displayName: "PayX Passkey User"
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (!credential) throw new Error("Passkey creation failed or was cancelled.");

    const privateKey = getWalletForIdentifier(credential.id);
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http()
    });
    
    return {
      account,
      client,
      address: account.address,
      privateKey,
      type: 'passkey',
      passkeyId: credential.id
    };
  } catch (err) {
    console.error("Passkey error:", err);
    throw err;
  }
};

export const loginWithPasskey = async () => {
  if (!window.PublicKeyCredential) throw new Error("WebAuthn is not supported.");
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: window.location.hostname,
        userVerification: "required",
        timeout: 60000
      }
    });

    if (!credential) throw new Error("Passkey login failed.");

    const privateKey = getWalletForIdentifier(credential.id);
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http()
    });
    
    return {
      account,
      client,
      address: account.address,
      privateKey,
      type: 'passkey',
      passkeyId: credential.id
    };
  } catch (err) {
    console.error("Passkey login error:", err);
    throw err;
  }
};

export const initAppKit = (walletData) => {
  // Initialize Circle AppKit
  const adapter = createViemAdapterFromPrivateKey({ 
    privateKey: walletData.privateKey,
    chain: arcTestnet
  });
  
  // Dummy initialization to satisfy SDK requirements without a real kitKey
  const kit = new AppKit();
  
  return { kit, adapter };
};
