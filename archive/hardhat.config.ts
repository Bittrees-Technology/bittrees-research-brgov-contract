import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@openzeppelin/hardhat-defender';
import 'hardhat-watcher';

import dotenv from 'dotenv';
dotenv.config();

// default values are there to avoid failures when running tests in CI
const TESTNET_RPC = process.env.TESTNET_RPC || '1'.repeat(32);
const MAINNET_RPC = process.env.MAINNET_RPC || '1'.repeat(32);
const PRIVATE_KEY = process.env.PRIVATE_KEY || '1'.repeat(64);

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.17',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },
    defender: {
        apiKey: process.env.DEFENDER_TEAM_API_KEY || '',
        apiSecret: process.env.DEFENDER_TEAM_API_SECRET_KEY || '',
    },
    networks: {
        testnet: {
            url: TESTNET_RPC,
            accounts: [PRIVATE_KEY],
        },
        mainnet: {
            url: MAINNET_RPC,
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY ?? '',
        customChains: [
            {
                network: 'base',
                chainId: 8453,
                urls: {
                    apiURL: 'https://api.basescan.org/api',
                    browserURL: 'https://basescan.org/',
                },
            },
            {
              network: "base sepolia",
              chainId: 84532,
              urls: {
                apiURL: "https://api-sepolia.basescan.org/api",
                browserURL: "https://sepolia.basescan.org/"
              }
            }
          ]
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
    },
    watcher: {
        test: {
            tasks: [
                {
                    command: 'test',
                    params: {
                        testFiles: ['{path}'],
                    },
                },
            ],
            files: ['./test/**/*'],
            verbose: true,
            clearOnStart: true,
            start: 'echo Running test task now...',
        },
    },
};

export default config;
