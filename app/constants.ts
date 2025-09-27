// Deployed package IDs
export const DEVNET_CROWDFUNDING_PACKAGE_ID = "0xb1b127b4ec9bba67a818e96fb597c465ebb8779f6836c1767f47349d5dc55132"; 
export const TESTNET_CROWDFUNDING_PACKAGE_ID = "0xb1b127b4ec9bba67a818e96fb597c465ebb8779f6836c1767f47349d5dc55132"; // Same as testnet for now
export const MAINNET_CROWDFUNDING_PACKAGE_ID = "0x0000000000000000000000000000000000000000000000000000000000000001"; // Deploy to mainnet later

// Campaign states from the Move contract
export const CAMPAIGN_STATE = {
  ACTIVE: 0,
  SUCCEEDED: 1,
  FAILED: 2,
} as const;

// Other constants
export const SUI_DECIMALS = 9;
export const MIST_PER_SUI = 1_000_000_000;
