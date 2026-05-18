import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { walletId, destinationAddress, amount } = req.body;

  if (!process.env.CIRCLE_API_KEY || !process.env.ENTITY_SECRET_CIPHERTEXT) {
    return res.status(500).json({ error: "Circle API keys are missing" });
  }

  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.ENTITY_SECRET_CIPHERTEXT,
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
      tokenId: '10042f88-4444-59e5-950c-e275f6ed3df6', // Official Testnet USDC on ETH-SEPOLIA
      walletId: walletId
    });

    res.status(200).json({ transactionId: transferRes.data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to send transaction" });
  }
}
