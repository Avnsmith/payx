import { ethers } from 'ethers';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2';
import { AppKit } from '@circle-fin/app-kit';

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545')
});

const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

// Deterministically select one of the 20 pre-funded Hardhat accounts
const getFundedAccount = (identifier) => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % 20;
  const wallet = ethers.HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, null, "m/44'/60'/0'/0/" + index);
  return wallet.privateKey;
};

export const getWalletFromEmail = (email) => {
  const privateKey = getFundedAccount(email.toLowerCase());
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: hardhat,
    transport: http('http://127.0.0.1:8545'),
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

    const privateKey = getFundedAccount(credential.id);
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: hardhat,
      transport: http('http://127.0.0.1:8545'),
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

    const privateKey = getFundedAccount(credential.id);
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: hardhat,
      transport: http('http://127.0.0.1:8545'),
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
  // Initialize Circle AppKit using the local Hardhat chain
  const adapter = createViemAdapterFromPrivateKey({ 
    privateKey: walletData.privateKey,
    chain: hardhat
  });
  
  const kit = new AppKit();
  
  return { kit, adapter };
};
