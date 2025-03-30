import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ledger";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",

  networks: {
    hardhat: {
      // This setting helps testing chainId conditionals
      chainId: 31337
    },

    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
      // When using Ledger, include your address here
      ledgerAccounts: process.env.USE_LEDGER === "true" && process.env.LEDGER_ADDRESS
          ? [process.env.LEDGER_ADDRESS]
          : [],
      // Or use regular accounts for testing
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },

    // Add other networks as needed (goerli, sepolia, polygon, etc.)
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};

export default config;