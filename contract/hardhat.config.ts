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
        optimism: {
            url: process.env.OPTIMISM_RPC_URL,
            chainId: 10,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        arbitrum: {
            url: process.env.ARBITRUM_RPC_URL,
            chainId: 42161,
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
        optimismSepolia: {
            url: process.env.OPTIMISM_SEPOLIA_RPC_URL,
            chainId: 11155420,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
        arbitrumSepolia: {
            url: process.env.ARBITRUM_SEPOLIA_RPC_URL,
            chainId: 421614,
            ledgerAccounts: process.env.USE_LEDGER === 'true' && process.env.LEDGER_ADDRESS
                ? [process.env.LEDGER_ADDRESS]
                : [],
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            // ===== Mainnet Networks =====
            mainnet: process.env.ETHERSCAN_API_KEY || '',
            base: process.env.BASESCAN_API_KEY || '',
            optimism: process.env.OPTIMISM_API_KEY || '',
            arbitrum: process.env.ARBISCAN_API_KEY || '',

            // ===== Testnet Networks =====
            sepolia: process.env.ETHERSCAN_API_KEY || '',
            baseSepolia: process.env.BASESCAN_API_KEY || '',
            optimismSepolia: process.env.OPTIMISM_API_KEY || '',
            arbitrumSepolia: process.env.ARBISCAN_API_KEY || '',
        },
        customChains: [
            // ===== Mainnet Networks =====
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
                network: 'optimism',
                chainId: 10,
                urls: {
                    apiURL: 'https://api-optimistic.etherscan.io/api',
                    browserURL: 'https://optimistic.etherscan.io/',
                },
            },
            {
                network: 'arbitrum',
                chainId: 42161,
                urls: {
                    apiURL: 'https://api.arbiscan.io/api',
                    browserURL: 'https://arbiscan.io/',
                },
            },

            // ===== Testnet Networks =====
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
            {
                network: 'optimismSepolia',
                chainId: 11155420,
                urls: {
                    apiURL: 'https://api-sepolia-optimistic.etherscan.io/api',
                    browserURL: 'https://sepolia-optimistic.etherscan.io/',
                },
            },
            {
                network: 'arbitrumSepolia',
                chainId: 421614,
                urls: {
                    apiURL: 'https://api-sepolia.arbiscan.io/api',
                    browserURL: 'https://sepolia.arbiscan.io/',
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