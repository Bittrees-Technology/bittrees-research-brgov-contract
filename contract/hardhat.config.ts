import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@nomicfoundation/hardhat-ledger';
import './tasks';
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.28',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            }
        }
    },
    networks: {
        hardhat: {
            // This setting helps testing chainId conditionals
            chainId: 31337,
        },

        // ===== Mainnet Networks =====
        mainnet: {
            url: process.env.MAINNET_RPC_URL || '',
            chainId: 1,
            // When using Ledger, include your address here
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            // Or use regular accounts for testing
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        base: {
            url: process.env.BASE_RPC_URL || '',
            chainId: 8453,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },

        // ===== Testnet Networks =====
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || '',
            chainId: 11155111,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        baseSepolia: {
            url: process.env.BASE_SEPOLIA_RPC_URL || '',
            chainId: 84532,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },

    },
    etherscan: {
        apiKey: {
            mainnet: process.env.ETHERSCAN_API_KEY || '',
            base: process.env.BASESCAN_API_KEY || '',
            sepolia: process.env.ETHERSCAN_API_KEY || '',
            baseSepolia: process.env.BASESCAN_API_KEY || '',
        },
        customChains: [
            {
                network: 'mainnet',
                chainId: 1,
                urls: {
                    apiURL: 'https://api.etherscan.io/api',
                    browserURL: 'https://etherscan.io',
                },
            },
            {
                network: 'base',
                chainId: 8453,
                urls: {
                    apiURL: 'https://api.basescan.org/api',
                    browserURL: 'https://basescan.org/',
                },
            },
            {
                network: 'sepolia',
                chainId: 11155111,
                urls: {
                    apiURL: 'https://api-sepolia.etherscan.io/api',
                    browserURL: 'https://sepolia.etherscan.io',
                },
            },
            {
                network: 'baseSepolia',
                chainId: 84532,
                urls: {
                    apiURL: 'https://api-sepolia.basescan.org/api',
                    browserURL: 'https://sepolia.basescan.org/',
                },
            },
        ],
    },
    sourcify: {
        enabled: true
    },
    typechain: {
        outDir: 'typechain-types',
        target: 'ethers-v6',
    },
};

export default config;