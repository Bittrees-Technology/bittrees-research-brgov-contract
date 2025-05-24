import dotenv from 'dotenv';

dotenv.config();

type IConfig = {
    initialBaseURI: string;
    treasuryAddress: string;
    adminAddress: string;
    defaultAdminAddress: string;
    initialAdminAndDefaultAdminAddress: string;
    projectName: string;
    bittreesResearchGnosisSafeAddress: string;
    bittreesTechnologyGnosisSafeAddress: string;
    create2FactoryCallerAddress: string;
    safeServiceURLs: {
        [key: string]: string;
    };
    gnosisCreate2FactoryAddress: string;
    proposeTxToSafe: boolean;
    useLedger: boolean;
    ledgerAddress: string;
    network: {
        [key: string]: {
            isTestnet: boolean;
            baseURI: string;
            paymentTokens: {
                [key: string]: {
                    name: string,
                    contractAddress: string;
                    priceInMajorUnits: string;
                    priceInMinorUnits: string;
                }
            }
        }
    }
}

/**
 * This config holds configurations not required by hardhat and related to this specific
 * project. Cross-chain configs should be added to the top level, and chain-dependent
 * configs should be added under the 'networks' key. Keys for networks should match the
 * keys used in the hardhat.config.ts so the relevant config can be matched/retrieved
 * programmatically in the execution context of the script/task being run. Where values
 * might be convenient to override for testing, add it to the .env and .env.sample, with
 * defaults provided for the standard/official deployment/s.
 * */
export const CONFIG: IConfig = {
    // ===== BNOTE CONTRACT DEPLOYMENT DETAILS =====
    initialBaseURI: 'https://research.bittrees.org/',
    treasuryAddress: process.env.TREASURY_ADDRESS || '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f',
    adminAddress: process.env.ADMIN_ADDRESS || '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f',
    defaultAdminAddress: process.env.DEFAULT_ADMIN_ADDRESS || '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f',
    initialAdminAndDefaultAdminAddress: process.env.INITIAL_ADMIN_AND_DEFAULT_ADMIN_ADDRESS || '0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a',
    /**
     * Used to generate the salt which influences the contract addresses being
     * the same on all networks.
     *
     * TL;DR - do not change the projectName value.
     * */
    projectName: 'BittreesResearchPreferredStock',

    // ===== GNOSIS SAFE DETAILS =====
    bittreesResearchGnosisSafeAddress: '0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f',
    bittreesTechnologyGnosisSafeAddress: '0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a',
    /**
     * The Bittrees Technology Gnosis Safe address(0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a)
     * MUST always be the caller of the safeCreate2 function on the gnosisCreate2FactoryAddress
     * contract at address(0x0000000000FFe8B47B3e2130213B802212439497) to result in the same
     * contract address across chains. Do this for official testnet deployments too. Only left
     * as an ENV value for convenience in non-official testnet deployments.
     *
     * TL;DR value MUST be 0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a for any official
     * deployments, whether testnet or mainnet
     * */
    create2FactoryCallerAddress: process.env.CREATE2_FACTORY_CALLER_ADDRESS || '0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a',
    safeServiceURLs: {
        // Mainnet URLs
        mainnet: 'https://safe-transaction-mainnet.safe.global',
        base: 'https://safe-transaction-base.safe.global',
        optimism: 'https://safe-transaction-optimism.safe.global',
        arbitrum: 'https://safe-transaction-arbitrum.safe.global',

        // Testnet URLs
        sepolia: 'https://safe-transaction-sepolia.safe.global',
        baseSepolia: 'https://safe-transaction-base-sepolia.safe.global',
        optimismSepolia: 'https://safe-transaction-optimism-sepolia.safe.global',
        arbitrumSepolia: 'https://safe-transaction-arbitrum-sepolia.safe.global',
    },

    /**
     * CREATE2 Factory Address - must be the same across all networks to achieve
     * the same deployed proxy and implementation contract addresses! We're using
     * the gnosis create2 deployer contract, so we have a dependency on gnosis
     * having deployed this contract to a chain before we can deploy there if we
     * want to maintain the same contract across networks
     * */
    gnosisCreate2FactoryAddress: '0x0000000000FFe8B47B3e2130213B802212439497',

    // Execution mode
    proposeTxToSafe: process.env.PROPOSE_TX === 'true',
    useLedger: process.env.USE_LEDGER === 'true',
    ledgerAddress: process.env.LEDGER_ADDRESS || '',
    network: {
        // ===== Mainnet Networks =====
        mainnet: {
            isTestnet: false,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO get and upload final images including contract collection image and banner image
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0x6bDdE71Cf0C751EB6d5EdB8418e43D3d9427e436',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
                WBTC: {
                    name: 'Wrapped BTC',
                    contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                tBTC: {
                    name: 'tBTC v2',
                    contractAddress: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '1000000000000000', // decimals 18
                },
                cbBTC: {
                    name: 'Coinbase Wrapped BTC',
                    contractAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                LBTC: {
                    name: 'Lombard Staked BTC',
                    contractAddress: '0x8236a87084f8B84306f72007F36F2618A5634494',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                kBTC: {
                    name: 'Kraken Wrapped Bitcoin',
                    contractAddress: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                BBTC_1: {
                    name: 'BounceBit BTC',
                    contractAddress: '0xF5e11df1ebCf78b6b6D26E04FF19cD786a1e81dC',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '1000000000000000', // decimals 18
                },
                BBTC_2: {
                    name: 'Binance Wrapped BTC',
                    contractAddress: '0x9BE89D2a4cd102D8Fecc6BF9dA793be995C22541',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
            },
        },
        base: {
            isTestnet: false,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0x4aCFF883f2879e69e67B7003ccec56C73ee41F6f',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
                WBTC: {
                    name: 'Wrapped BTC',
                    contractAddress: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                tBTC: {
                    name: 'Base tBTC v2',
                    contractAddress: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '1000000000000000', // decimals 18
                },
                cbBTC: {
                    name: 'Coinbase Wrapped BTC',
                    contractAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                LBTC: {
                    name: 'Lombard Staked BTC',
                    contractAddress: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
            },
        },
        optimism: {
            isTestnet: false,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0xB260d236F5eA5094D31F016160705ff53ac45028',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
                WBTC: {
                    name: 'Wrapped BTC',
                    contractAddress: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
                tBTC: {
                    name: 'Optimism tBTC v2',
                    contractAddress: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '1000000000000000', // decimals 18
                },
                kBTC: {
                    name: 'Kraken Wrapped Bitcoin',
                    contractAddress: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
            },
        },
        arbitrum: {
            isTestnet: false,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0xA29871E78FC005d31982f942E1569265BA145A34',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
            },
        },
        ink: {
            isTestnet: false,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                kBTC: {
                    name: 'Kraken Wrapped Bitcoin',
                    contractAddress: '0x73E0C0d45E048D25Fc26Fa3159b0aA04BfA4Db98',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '100000', // decimals 8
                },
            },
        },

        // ===== Testnet Networks =====
        sepolia: {
            isTestnet: true,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0x8389eFa79EF27De249AF63f034D7A94dFBdd4cBE',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
                tBTC: {
                    name: 'tBTC v2',
                    contractAddress: '0x517f2982701695D4E52f1ECFBEf3ba31Df470161',
                    priceInMajorUnits: '0.001',
                    priceInMinorUnits: '1000000000000000', // decimals 18
                },
            },
        },
        baseSepolia: {
            isTestnet: true,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0xF8c91a56db8485FCee21c5bf6345B063Cf4228F6',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
            },
        },
        optimismSepolia: {
            isTestnet: true,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0x7E5A0b6C5c32883AE8E5b830c05688Eff317c3fb',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
            },
        },
        arbitrumSepolia: {
            isTestnet: true,
            baseURI: 'https://ipfs.io/ipfs/bafybeiehx7jdudlmwpsoayke24i25r3gtjfdswtbu5v25lii46ermsd4pu', // TODO replace with chain specific link
            paymentTokens: {
                BTREE: {
                    name: 'BTREE',
                    contractAddress: '0x65414D6A6DF9A139a462c2F43199dE580A348dF9',
                    priceInMajorUnits: '1000',
                    priceInMinorUnits: '1000000000000000000000',
                },
            },
        },
    },
};