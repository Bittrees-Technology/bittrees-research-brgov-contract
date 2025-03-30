import { ethers, network } from "hardhat";
import { keccak256 } from "ethers";
import fs from "fs";
import Safe from "@safe-global/safe-core-sdk";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import SafeServiceClient from "@safe-global/safe-service-client";
import EthersAdapter from "@safe-global/safe-ethers-lib";
import { providers, Wallet, utils as ethersV5Utils } from "ethers-v5";  // Import ethers v5 explicitly
import dotenv from "dotenv";

dotenv.config();

// Configuration - Move these to .env or hardhat.config.ts in practice
const CONFIG = {
    // Contract deployment details
    baseURI: "https://bittrees.com/metadata/",
    treasuryAddress: process.env.TREASURY_ADDRESS || "0x...",
    adminAddress: process.env.ADMIN_ADDRESS || "0x...",
    projectName: "BittreesPreferredStockNotes_v1",

    // Safe details
    safeAddress: process.env.SAFE_ADDRESS || "0x...",
    safeServiceUrl: process.env.SAFE_SERVICE_URL || "https://safe-transaction-mainnet.safe.global",

    // CREATE2 Factory Address - Same across all networks!
    // This is the official Gnosis CREATE2 Factory
    create2FactoryAddress: "0x0000000000FFe8B47B3e2130213B802212439497",

    // Execution mode
    proposeTxToSafe: process.env.PROPOSE_TX === "true",
    useLedger: process.env.USE_LEDGER === "true",
    ledgerAddress: process.env.LEDGER_ADDRESS || "",
};

// CREATE2 Factory ABI - only the functions we need
const CREATE2_FACTORY_ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
            { "internalType": "bytes", "name": "initCode", "type": "bytes" }
        ],
        "name": "deploy",
        "outputs": [{ "internalType": "address", "name": "createdContract", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
            { "internalType": "bytes", "name": "initCode", "type": "bytes" }
        ],
        "name": "computeAddress",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    }
];

async function main() {
    console.log(`\nNetwork: ${network.name}`);
    console.log("==== BNote Deployment Information ====");

    // Generate deterministic salt from project name
    const saltText = CONFIG.projectName;
    const salt = keccak256(ethers.toUtf8Bytes(saltText));
    console.log(`\nSalt Text: ${saltText}`);
    console.log(`Salt (hex): ${salt}`);

    // Get contract factories
    const BNoteFactory = await ethers.getContractFactory("BNote");
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

    // Get implementation bytecode
    const implementationBytecode = BNoteFactory.bytecode;

    // Create the CREATE2 factory instance
    const create2Factory = new ethers.Contract(
        CONFIG.create2FactoryAddress,
        CREATE2_FACTORY_ABI,
        (await ethers.getSigners())[0]
    );

    // Calculate implementation address
    const implAddress = await create2Factory.computeAddress(
        salt,
        implementationBytecode
    );

    console.log("\n==== Implementation Contract ====");
    console.log("Implementation Bytecode Length:", implementationBytecode.length / 2 - 1, "bytes");
    console.log("Implementation Address (via CREATE2):", implAddress);

    // Encode initialization call for the proxy
    const initData = BNoteFactory.interface.encodeFunctionData("initialize", [
        CONFIG.baseURI,
        CONFIG.treasuryAddress,
        CONFIG.adminAddress
    ]);

    // Encode proxy constructor arguments
    const proxyCreationCode = ProxyFactory.bytecode +
        ProxyFactory.interface.encodeDeploy([implAddress, initData]).slice(2);

    // Calculate proxy address
    const proxySalt = keccak256(ethers.toUtf8Bytes(`${saltText}_proxy`));
    const proxyAddress = await create2Factory.computeAddress(
        proxySalt,
        proxyCreationCode
    );

    console.log("\n==== Proxy Contract ====");
    console.log("Proxy Creation Bytecode Length:", proxyCreationCode.length / 2 - 1, "bytes");
    console.log("Proxy Salt:", proxySalt);
    console.log("Proxy Address (via CREATE2):", proxyAddress);
    console.log("This will be your main contract address for BNote");

    // Save deployment data to file
    const deploymentData = {
        network: network.name,
        implementationSalt: salt,
        proxySalt: proxySalt,
        create2Factory: CONFIG.create2FactoryAddress,
        implementation: {
            bytecode: implementationBytecode,
            address: implAddress,
        },
        proxy: {
            bytecode: proxyCreationCode,
            address: proxyAddress,
        },
        config: {
            baseURI: CONFIG.baseURI,
            treasuryAddress: CONFIG.treasuryAddress,
            adminAddress: CONFIG.adminAddress,
        }
    };

    const outputFile = `bnote-deployment-${network.name}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));
    console.log(`\nDeployment data saved to ${outputFile}`);

    // Create and propose Safe transactions
    if (CONFIG.proposeTxToSafe) {
        console.log("\n==== Creating Safe Transactions ====");

        // Get the signer - either from ledger or default hardhat
        let signer;
        if (CONFIG.useLedger) {
            console.log(`Using Ledger with address: ${CONFIG.ledgerAddress}`);
            signer = await ethers.getSigner(CONFIG.ledgerAddress);
        } else {
            const signers = await ethers.getSigners();
            signer = signers[0];
            console.log(`Using signer: ${await signer.getAddress()}`);
        }

        // Create an ethers v5 compatible provider and wallet for Safe SDK
        const signerAddress = await signer.getAddress();
        const privateKey = await getSignerPrivateKey(signer);

        const providerUrl = (network.config as any).url || "http://localhost:8545";
        const ethersV5Provider = new providers.JsonRpcProvider(providerUrl);
        const ethersV5Wallet = new Wallet(privateKey, ethersV5Provider);

        // Create ethers adapter for Safe SDK - ethers v5 specific
        const ethAdapter = new EthersAdapter({
            ethers: { Signer: Wallet, provider: ethersV5Provider } as any,
            signerOrProvider: ethersV5Wallet
        });

        // Initialize Safe SDK
        const safeSdk = await Safe.create({
            ethAdapter,
            safeAddress: CONFIG.safeAddress
        });

        // Initialize Safe Service client for transaction proposal
        const safeService = new SafeServiceClient({
            txServiceUrl: CONFIG.safeServiceUrl,
            ethAdapter
        });

        // Get next nonce
        const nextNonce = await safeService.getNextNonce(CONFIG.safeAddress);

        // Create a factory interface for ethers v5
        const v5FactoryInterface = new ethersV5Utils.Interface(CREATE2_FACTORY_ABI);

        // Encode the call to deploy the implementation contract
        const implDeployCalldata = v5FactoryInterface.encodeFunctionData("deploy", [
            salt,
            implementationBytecode
        ]);

        // Prepare implementation deployment transaction
        const implTxData: SafeTransactionDataPartial = {
            to: CONFIG.create2FactoryAddress,  // CREATE2 factory address
            value: "0",
            data: implDeployCalldata,
            operation: 0,  // Regular call
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: ethers.ZeroAddress,
            refundReceiver: ethers.ZeroAddress,
            nonce: nextNonce
        };

        // Create the transaction
        const implSafeTx = await safeSdk.createTransaction({ safeTransactionData: implTxData });

        const implSafeTxHash = await safeSdk.getTransactionHash(implSafeTx)

        // Sign the transaction
        const signedImplTx = await safeSdk.signTransaction(implSafeTx);

        // Propose transaction to Safe
        const implTxHash = await safeService.proposeTransaction({
            safeAddress: CONFIG.safeAddress,
            safeTransactionData: implSafeTx.data,
            safeTxHash: implSafeTxHash,
            senderAddress: signerAddress,
            senderSignature: signedImplTx.signatures.get(signerAddress.toLowerCase())!.data,
        });

        console.log(`\nImplementation transaction proposed to Safe:`);
        console.log(`Safe Transaction Hash: ${implTxHash}`);
        console.log(`Check the transaction in the Safe UI: ${getSafeWebUrl(network.name, CONFIG.safeAddress)}`);

        // Encode the call to deploy the proxy contract
        const proxyDeployCalldata = v5FactoryInterface.encodeFunctionData("deploy", [
            proxySalt,
            proxyCreationCode
        ]);

        console.log("\nThe proxy transaction must be executed AFTER the implementation transaction completes.");
        console.log("Would you like to propose the proxy deployment transaction now? (Usually wait for implementation to be deployed first)");

        const proposeProxyNow = process.env.PROPOSE_PROXY_TX === "true";

        if (proposeProxyNow) {
            // Prepare proxy deployment transaction
            const proxyTxData: SafeTransactionDataPartial = {
                to: CONFIG.create2FactoryAddress,  // CREATE2 factory address
                value: "0",
                data: proxyDeployCalldata,
                operation: 0,  // Regular call
                safeTxGas: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: ethers.ZeroAddress,
                refundReceiver: ethers.ZeroAddress,
                nonce: nextNonce + 1  // Increment nonce for second transaction
            };

            // Create the transaction
            const proxySafeTx = await safeSdk.createTransaction({ safeTransactionData: proxyTxData });

            const proxySafeTxHash = await safeSdk.getTransactionHash(proxySafeTx);

            // Sign the transaction
            const signedProxyTx = await safeSdk.signTransaction(proxySafeTx);

            // Propose transaction to Safe
            const proxyTxHash = await safeService.proposeTransaction({
                safeAddress: CONFIG.safeAddress,
                safeTransactionData: proxySafeTx.data,
                safeTxHash: proxySafeTxHash,
                senderAddress: signerAddress,
                senderSignature: signedProxyTx.signatures.get(signerAddress.toLowerCase())!.data,
            });

            console.log(`\nProxy transaction proposed to Safe:`);
            console.log(`Safe Transaction Hash: ${proxyTxHash}`);
            console.log(`Check the transaction in the Safe UI: ${getSafeWebUrl(network.name, CONFIG.safeAddress)}`);
        } else {
            console.log("\nTo propose the proxy transaction later, run this script with PROPOSE_PROXY_TX=true");
        }
    } else {
        // Output manual instructions for Safe UI
        console.log("\n==== For Manual Safe Transaction Creation ====");

        // Create interface for encoding
        const factoryInterface = new ethers.Interface(CREATE2_FACTORY_ABI);

        // Encode implementation deployment call
        const implDeployCalldata = factoryInterface.encodeFunctionData("deploy", [
            salt,
            implementationBytecode
        ]);

        console.log("\nStep 1: Deploy Implementation Contract via CREATE2 Factory");
        console.log(`To address: ${CONFIG.create2FactoryAddress} (CREATE2 Factory)`);
        console.log("Value: 0");
        console.log("Operation: 0 (Call)");
        console.log(`Data: ${implDeployCalldata}`);

        // Encode proxy deployment call
        const proxyDeployCalldata = factoryInterface.encodeFunctionData("deploy", [
            proxySalt,
            proxyCreationCode
        ]);

        console.log("\nStep 2: Deploy Proxy Contract via CREATE2 Factory (after implementation deploys)");
        console.log(`To address: ${CONFIG.create2FactoryAddress} (CREATE2 Factory)`);
        console.log("Value: 0");
        console.log("Operation: 0 (Call)");
        console.log(`Data: ${proxyDeployCalldata}`);
    }
}

// Helper function to get private key from a signer - WARNING: This is for development only!
// In production, you should use Ledger integration instead of extracting private keys
async function getSignerPrivateKey(signer: any): Promise<string> {
    if (CONFIG.useLedger) {
        throw new Error("Cannot extract private key from Ledger. Use a different approach for production.");
    }

    // This is a development-only approach for hardhat
    if (network.name === "hardhat" || network.name === "localhost") {
        // For hardhat, we can access the private key
        return (signer as any).privateKey;
    }

    // For other networks, you should pass the private key via env var
    if (process.env.PRIVATE_KEY) {
        return process.env.PRIVATE_KEY;
    }

    throw new Error("Private key not available. Please provide a PRIVATE_KEY env variable for non-local networks.");
}

// Helper function to get the Safe web interface URL based on network
function getSafeWebUrl(
    networkName: string,
    safeAddress: string
): string {
    let baseUrl;

    switch (networkName) {
        case "mainnet":
            baseUrl = "https://app.safe.global/eth";
            break;
        case "goerli":
            baseUrl = "https://app.safe.global/gor";
            break;
        case "sepolia":
            baseUrl = "https://app.safe.global/sep";
            break;
        case "polygon":
            baseUrl = "https://app.safe.global/matic";
            break;
        default:
            baseUrl = "https://app.safe.global";
    }

    return `${baseUrl}:${safeAddress}/transactions/queue`;
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });