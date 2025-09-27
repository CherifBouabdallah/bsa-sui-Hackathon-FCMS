import { getFullnodeUrl } from "@mysten/sui/client";
import {
  DEVNET_CROWDFUNDING_PACKAGE_ID,
  TESTNET_CROWDFUNDING_PACKAGE_ID,
  MAINNET_CROWDFUNDING_PACKAGE_ID,
} from "./constants";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        crowdfundingPackageId: DEVNET_CROWDFUNDING_PACKAGE_ID,
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        crowdfundingPackageId: TESTNET_CROWDFUNDING_PACKAGE_ID,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        crowdfundingPackageId: MAINNET_CROWDFUNDING_PACKAGE_ID,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
