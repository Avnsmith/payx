import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const { walletId } = req.query;

  if (!walletId) return res.status(400).json({ error: "walletId required" });

  if (!process.env.CIRCLE_API_KEY || !process.env.ENTITY_SECRET_CIPHERTEXT) {
    return res.status(500).json({ error: "Circle API keys are missing" });
  }

  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.ENTITY_SECRET_CIPHERTEXT,
  });

  try {
    const balanceRes = await circle.getWalletTokenBalance({
      id: walletId
    });

    // USDC Token ID on Sepolia is '10042f88-4444-59e5-950c-e275f6ed3df6' or check token balances array
    let usdcBalance = "0.00";
    if (balanceRes.data && balanceRes.data.tokenBalances) {
      const usdcToken = balanceRes.data.tokenBalances.find(t => t.token.symbol === 'USDC');
      if (usdcToken) {
        usdcBalance = usdcToken.amount;
      }
    }

    res.status(200).json({ balance: usdcBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch balance" });
  }
}
