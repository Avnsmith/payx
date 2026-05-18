import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  if (!process.env.CIRCLE_API_KEY || !process.env.ENTITY_SECRET_CIPHERTEXT) {
    return res.status(500).json({ error: "Circle API keys are missing" });
  }

  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.ENTITY_SECRET_CIPHERTEXT,
  });

  try {
    // Fetch all wallets (in a real app you'd filter by user/walletSet, but for demo we fetch all and let client match)
    const walletsRes = await circle.getWallets();
    res.status(200).json({ wallets: walletsRes.data.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch wallets" });
  }
}
