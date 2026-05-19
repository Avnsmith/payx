import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { email } = req.body;

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
    // 1. Get or create Wallet Set using the correct listWalletSets method
    const walletSetsRes = await circle.listWalletSets();
    let walletSetId;
    
    if (walletSetsRes.data && walletSetsRes.data.walletSets && walletSetsRes.data.walletSets.length > 0) {
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
      accountType: 'SCA',
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
