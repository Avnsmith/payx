import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

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
    const walletsRes = await circle.listWallets();
    res.status(200).json({ wallets: walletsRes.data.wallets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch wallets" });
  }
}
