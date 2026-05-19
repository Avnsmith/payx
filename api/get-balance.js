import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const { walletId } = req.query;

  if (!walletId) return res.status(400).json({ error: "walletId required" });

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.ENTITY_SECRET_CIPHERTEXT;

  if (!apiKey || !entitySecret) {
    return res.status(500).json({ error: "Circle API credentials are missing" });
  }

  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: apiKey,
    entitySecret: entitySecret,
  });

  try {
    const balanceRes = await circle.getWalletTokenBalance({
      id: walletId
    });

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
