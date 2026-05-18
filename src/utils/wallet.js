import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { ethers } from 'ethers';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { AppKit } from '@circle-fin/app-kit';

// Dummy Arc Testnet chain definition for Viem if needed
export const arcTestnet = defineChain({
  id: 984122, // Example ID, might need updating to real Arc Testnet ID
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.arc.network/rpc'] },
    public: { http: ['https://testnet.arc.network/rpc'] },
  },
});

export const getWalletFromEmail = (email) => {
  // Deterministic private key derivation for demo purposes
  // DO NOT USE THIS IN PRODUCTION FOR REAL FUNDS
  const secretSalt = "payx-arc-network-super-secret";
  const hash = ethers.id(email.toLowerCase() + secretSalt);
  
  // Create an account from the private key
  const account = privateKeyToAccount(hash);
  
  // Create a Viem wallet client
  const client = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(),
  });
  
  return {
    account,
    client,
    address: account.address,
    privateKey: hash,
    type: 'email'
  };
};

export const getWalletFromPasskey = async () => {
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
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (!credential) throw new Error("Passkey creation failed or was cancelled.");

    const secretSalt = "payx-arc-network-super-secret";
    const hash = ethers.id(credential.id + secretSalt);
    
    const account = privateKeyToAccount(hash);
    const client = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    });
    
    return {
      account,
      client,
      address: account.address,
      privateKey: hash,
      type: 'passkey'
    };
  } catch (err) {
    console.error("Passkey error:", err);
    throw err;
  }
};

export const initAppKit = (walletData) => {
  // Create the adapter wrapper for AppKit
  const adapter = createViemAdapterFromPrivateKey({ 
    privateKey: walletData.privateKey 
  });
  
  // Initialize AppKit
  const kit = new AppKit();
  
  return { kit, adapter };
};
