// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract USDCFaucet {
    IERC20 public usdcToken;
    uint256 public claimAmount;
    
    mapping(address => uint256) public lastClaimTime;
    uint256 public constant LOCK_TIME = 1 minutes; // For testnet, allow frequent claims

    event FaucetFunded(uint256 amount);
    event TokensClaimed(address indexed to, uint256 amount);

    constructor(address _usdcTokenAddress) {
        usdcToken = IERC20(_usdcTokenAddress);
        claimAmount = 50 * 10 ** 6; // 50 USDC (6 decimals)
    }

    function claim() external {
        require(block.timestamp >= lastClaimTime[msg.sender] + LOCK_TIME, "USDCFaucet: Wait 1 minute between claims");
        require(usdcToken.balanceOf(address(this)) >= claimAmount, "USDCFaucet: Empty! Faucet needs funding.");

        lastClaimTime[msg.sender] = block.timestamp;
        
        require(usdcToken.transfer(msg.sender, claimAmount), "USDCFaucet: Transfer failed");
        
        emit TokensClaimed(msg.sender, claimAmount);
    }
}
