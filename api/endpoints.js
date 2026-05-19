import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const CIRCLE_BASE_URL = process.env.NEXT_PUBLIC_CIRCLE_BASE_URL ?? "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, ...params } = req.body ?? {};

    if (!action) {
      return res.status(400).json({ error: "Missing action" });
    }

    if (!CIRCLE_API_KEY) {
      return res.status(500).json({ error: "Circle API Key is not configured" });
    }

    switch (action) {
      case "requestEmailOtp": {
        const { deviceId, email } = params;
        if (!deviceId || !email) {
          return res.status(400).json({ error: "Missing deviceId or email" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users/email/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
          },
          body: JSON.stringify({
            idempotencyKey: uuidv4(),
            deviceId,
            email,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      case "initializeUser": {
        const { userToken } = params;
        if (!userToken) {
          return res.status(400).json({ error: "Missing userToken" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
          body: JSON.stringify({
            idempotencyKey: uuidv4(),
            accountType: "SCA",
            blockchains: ["ETH-SEPOLIA"],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      case "listWallets": {
        const { userToken } = params;
        if (!userToken) {
          return res.status(400).json({ error: "Missing userToken" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      case "getTokenBalance": {
        const { userToken, walletId } = params;
        if (!userToken || !walletId) {
          return res.status(400).json({ error: "Missing userToken or walletId" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets/${walletId}/balances`, {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      case "createTransfer": {
        const { userToken, walletId, destinationAddress, amount } = params;
        if (!userToken || !walletId || !destinationAddress || !amount) {
          return res.status(400).json({ error: "Missing required parameters for transfer" });
        }

        // Fetch balances first to obtain the USDC tokenId
        const balanceResponse = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets/${walletId}/balances`, {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });

        const balanceData = await balanceResponse.json();
        if (!balanceResponse.ok) {
          return res.status(balanceResponse.status).json(balanceData);
        }

        const usdcBalance = balanceData.data?.tokenBalances?.find(
          t => t.token.symbol === 'USDC' || t.token.name.includes('USDC')
        );

        if (!usdcBalance) {
          return res.status(400).json({ error: "No USDC balance found in user wallet" });
        }

        // Initiate transfer which yields a challengeId
        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/transactions/transfer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
          body: JSON.stringify({
            idempotencyKey: uuidv4(),
            walletId,
            destinationAddress,
            amounts: [amount],
            tokenId: usdcBalance.token.id,
            fee: {
              type: 'level',
              config: {
                feeLevel: 'MEDIUM'
              }
            }
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error("Error in /api/endpoints:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
