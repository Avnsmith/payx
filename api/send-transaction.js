import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { walletId, destinationAddress, amount } = req.body;

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
    const transferRes = await circle.createTransaction({
      idempotencyKey: uuidv4(),
      amounts: [amount],
      destinationAddress: destinationAddress,
      fee: {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM'
        }
      },
      tokenId: '10042f88-4444-59e5-950c-e275f6ed3df6',
      walletId: walletId
    });

    res.status(200).json({ transactionId: transferRes.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to send transaction" });
  }
}
