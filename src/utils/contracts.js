import { parseAbi } from 'viem';

export const USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const FAUCET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const USDC_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint amount) returns (bool)',
  'function decimals() view returns (uint8)'
]);

export const FAUCET_ABI = parseAbi([
  'function claim() external'
]);
