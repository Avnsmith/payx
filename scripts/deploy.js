import hre from "hardhat";

async function main() {
  console.log("Starting deployment...");

  console.log("Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`MockUSDC deployed to: ${usdcAddress}`);

  console.log("Deploying USDCFaucet...");
  const USDCFaucet = await hre.ethers.getContractFactory("USDCFaucet");
  const faucet = await USDCFaucet.deploy(usdcAddress);
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log(`USDCFaucet deployed to: ${faucetAddress}`);

  console.log("Funding Faucet with 100,000 USDC...");
  const amountToFund = hre.ethers.parseUnits("100000", 6);
  const tx = await usdc.transfer(faucetAddress, amountToFund);
  await tx.wait();
  console.log("Faucet funded successfully!");
  
  console.log("\n=================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log(`export const USDC_ADDRESS = "${usdcAddress}";`);
  console.log(`export const FAUCET_ADDRESS = "${faucetAddress}";`);
  console.log("=================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
