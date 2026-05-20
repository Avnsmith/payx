import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const CIRCLE_BASE_URL = process.env.NEXT_PUBLIC_CIRCLE_BASE_URL ?? "https://api.circle.com";
const FALLBACK_API_KEY = "TEST_API_KEY:0f37606e6ee9d0350c6eeb26fc22b106:ced0c91d5191ce66c81136d1d2150fee";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { action, customApiKey, ...params } = req.body ?? {};

    if (!action) {
      return res.status(400).json({ error: "Missing action" });
    }

    // Support dynamic custom API Key passed via headers or request body
    const CIRCLE_API_KEY = req.headers['x-circle-api-key'] || customApiKey || process.env.CIRCLE_API_KEY || FALLBACK_API_KEY;

    if (!CIRCLE_API_KEY) {
      return res.status(500).json({ error: "Circle API Key is not configured" });
    }

    switch (action) {
      case "createUser": {
        const { userId } = params;
        if (!userId) {
          return res.status(400).json({ error: "Missing required field: userId" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
          },
          body: JSON.stringify({
            userId,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          return res.status(response.status).json(data);
        }
        return res.status(200).json(data.data);
      }

      case "getUserToken": {
        const { userId } = params;
        if (!userId) {
          return res.status(400).json({ error: "Missing required field: userId" });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
          },
          body: JSON.stringify({
            userId,
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

        // Fetch balances first to obtain decimals
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
          t => t.token.tokenAddress?.toLowerCase() === '0x3600000000000000000000000000000000000000' ||
               t.token.symbol === 'USDC' ||
               t.token.name.includes('USDC')
        );

        const decimals = usdcBalance?.token?.decimals || 6;
        
        // Calculate amount in Wei/smallest unit
        const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();

        // Standard EVM contract execution for the custom USD contract
        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/transactions/contractExecution`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
          body: JSON.stringify({
            idempotencyKey: uuidv4(),
            walletId,
            contractAddress: "0x3600000000000000000000000000000000000000",
            abiFunctionSignature: "transfer(address,uint256)",
            abiParameters: [destinationAddress, amountInSmallestUnit],
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
