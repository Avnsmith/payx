import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { email } = req.body;

  if (!process.env.CIRCLE_API_KEY || !process.env.ENTITY_SECRET_CIPHERTEXT) {
    return res.status(500).json({ error: "Circle API keys are missing in backend" });
  }

  const circle = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.ENTITY_SECRET_CIPHERTEXT,
  });

  try {
    // 1. Get or create Wallet Set
    const walletSetsRes = await circle.getWalletSets();
    let walletSetId;
    if (walletSetsRes.data && walletSetsRes.data.walletSets.length > 0) {
      walletSetId = walletSetsRes.data.walletSets[0].id;
    } else {
      const createSetRes = await circle.createWalletSet({
        name: "PayX Users",
        idempotencyKey: uuidv4(),
      });
      walletSetId = createSetRes.data.walletSet.id;
    }

    // 2. Create the Wallet on Ethereum Sepolia for testnet USDC
    const createWalletRes = await circle.createWallets({
      idempotencyKey: uuidv4(),
      accountType: 'SCA', // Smart Contract Account allows gas abstraction
      blockchains: ['ETH-SEPOLIA'],
      count: 1,
      walletSetId: walletSetId,
      metadata: [
        { name: "email", value: email }
      ]
    });

    const wallet = createWalletRes.data.wallets[0];
    res.status(200).json({ walletId: wallet.id, address: wallet.address });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create wallet" });
  }
}
