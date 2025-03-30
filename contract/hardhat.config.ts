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

    // ===== Mainnet Networks =====
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.alchemyapi.io/v2/your-api-key",
      chainId: 1,
      // When using Ledger, include your address here
      ledgerAccounts: process.env.USE_LEDGER === "true" && process.env.LEDGER_ADDRESS
          ? [process.env.LEDGER_ADDRESS]
          : [],
      // Or use regular accounts for testing
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      ledgerAccounts: process.env.USE_LEDGER === "true" && process.env.LEDGER_ADDRESS
          ? [process.env.LEDGER_ADDRESS]
          : [],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },

    // ===== Testnet Networks =====
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-api-key",
      chainId: 11155111,
      ledgerAccounts: process.env.USE_LEDGER === "true" && process.env.LEDGER_ADDRESS
          ? [process.env.LEDGER_ADDRESS]
          : [],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      ledgerAccounts: process.env.USE_LEDGER === "true" && process.env.LEDGER_ADDRESS
          ? [process.env.LEDGER_ADDRESS]
          : [],
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }

  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  }
};

export default config;