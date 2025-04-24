import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
    // ===== CONTRACT DEPLOYMENT DETAILS =====
    initialBaseURI: "https://research.bittrees.org/",
    treasuryAddress: process.env.TREASURY_ADDRESS || "0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f",
    adminAddress: process.env.ADMIN_ADDRESS || "0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f",
    defaultAdminAddress: process.env.DEFAULT_ADMIN_ADDRESS || "0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f",
    initialAdminAndDefaultAdminAddress: process.env.INITIAL_ADMIN_AND_DEFAULT_ADMIN_ADDRESS || "0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a",
    /**
     * Used to generate the salt which influences the contract addresses being
     * the same on all networks.
     *
     * TL;DR - do not change the projectName value.
     * */
    projectName: "BittreesResearchPreferredStock",

    // ===== GNOSIS SAFE DETAILS =====
    bittreesResearchGnosisSafeAddress: "0x2F8f86e6E1Ff118861BEB7E583DE90f0449A264f",
    bittreesTechnologyGnosisSafeAddress: "0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a",
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
    create2FactoryCallerAddress: process.env.CREATE2_FACTORY_CALLER_ADDRESS || "0x2CB5C7bd24480C9D450eD07eb49F4525ee41083a",
    safeServiceURLs: {
        // Mainnet URLs
        mainnet: 'https://safe-transaction-mainnet.safe.global',
        base: 'https://safe-transaction-base.safe.global',

        // Testnet URLs
        sepolia: 'https://safe-transaction-sepolia.safe.global',
        baseSepolia: 'https://safe-transaction-base-sepolia.safe.global'
    },

    /**
     * CREATE2 Factory Address - must be the same across all networks to achieve
     * the same deployed proxy and implementation contract addresses! We're using
     * the gnosis create2 deployer contract, so we have a dependency on gnosis
     * having deployed this contract to a chain before we can deploy there if we
     * want to maintain the same contract across networks
     * */
    gnosisCreate2FactoryAddress: "0x0000000000FFe8B47B3e2130213B802212439497",

    // Execution mode
    proposeTxToSafe: process.env.PROPOSE_TX === "true",
    useLedger: process.env.USE_LEDGER === "true",
    ledgerAddress: process.env.LEDGER_ADDRESS || "",
};