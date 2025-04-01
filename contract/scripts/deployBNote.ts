import { ethers, network } from "hardhat";
import fs from "fs";
import dotenv from "dotenv";
import {
    calculateCreate2Address,
    generateCompatibleSalt,
    CREATE2_FACTORY_ABI,
    encodeFactoryDeploy,
    getSafeWebUrl
} from './helpers';

dotenv.config();

// Configuration - Move these to .env or hardhat.config.ts in practice
const CONFIG = {
    // Contract deployment details
    baseURI: "https://research.bittrees.org/",
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

async function main() {
    console.log(`\nNetwork: ${network.name}`);
    console.log("==== BNote Deployment Information ====");

    // Generate deterministic salt from project name
    const implSalt = generateCompatibleSalt(CONFIG.safeAddress, `${CONFIG.projectName}_impl`);
    console.log(`\nSalt Text: ${CONFIG.projectName}_impl`);
    console.log(`Compatible Salt (hex): ${implSalt}`);

    // Get contract factories
    const BNoteFactory = await ethers.getContractFactory("BNote");
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

    // Get implementation bytecode
    const implementationBytecode = BNoteFactory.bytecode;

    // Calculate implementation address
    const implAddress = calculateCreate2Address(
        CONFIG.create2FactoryAddress,
        implSalt,
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
    const proxySalt = generateCompatibleSalt(CONFIG.safeAddress, `${CONFIG.projectName}_proxy`);
    console.log(`\nProxy Salt Text: ${CONFIG.projectName}_proxy`);
    console.log(`Compatible Proxy Salt (hex): ${proxySalt}`);

    const proxyAddress = calculateCreate2Address(
        CONFIG.create2FactoryAddress,
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
        implementationSalt: implSalt,
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

    console.log("\n==== Transaction Information ====");

    // Get the signer - either from ledger or default hardhat
    let signer;
    if (CONFIG.useLedger) {
        console.log(`Using Ledger with address: ${CONFIG.ledgerAddress}`);
        signer = await ethers.getSigner(CONFIG.ledgerAddress);
        console.log("Ledger connected successfully!");
    } else {
        const signers = await ethers.getSigners();
        signer = signers[0];
        console.log(`Using signer: ${await signer.getAddress()}`);
    }

    // Create interface for encoding
    const factoryInterface = new ethers.Interface(CREATE2_FACTORY_ABI);

    // Encode implementation deployment call
    const implDeployCalldata = encodeFactoryDeploy(implSalt, implementationBytecode);

    // Check if code exists at implementation address
    const implCodeSize = await ethers.provider.getCode(implAddress).then(c => c.length);
    if (implCodeSize > 2) { // More than just '0x'
        console.log(`\n⚠️ Implementation already deployed at ${implAddress}`);
    }

    console.log("\n==== Implementation Transaction ====");
    console.log(`To address: ${CONFIG.create2FactoryAddress} (CREATE2 Factory)`);
    console.log("Value: 0");
    console.log("Operation: 0 (Call)");
    console.log(`Data: ${implDeployCalldata.slice(0, 66)}...${implDeployCalldata.slice(-64)}`);
    console.log("Gas: 1,500,000 (suggested minimum)");

    // Encode proxy deployment call
    const proxyDeployCalldata = encodeFactoryDeploy(proxySalt, proxyCreationCode);

    // Check if code exists at proxy address
    const proxyCodeSize = await ethers.provider.getCode(proxyAddress).then(c => c.length);
    if (proxyCodeSize > 2) { // More than just '0x'
        console.log(`\n⚠️ Proxy already deployed at ${proxyAddress}`);
    }

    console.log("\n==== Proxy Transaction (execute after implementation) ====");
    console.log(`To address: ${CONFIG.create2FactoryAddress} (CREATE2 Factory)`);
    console.log("Value: 0");
    console.log("Operation: 0 (Call)");
    console.log(`Data: ${proxyDeployCalldata.slice(0, 66)}...${proxyDeployCalldata.slice(-64)}`);
    console.log("Gas: 1,000,000 (suggested minimum)");

    console.log("\n==== Safe UI Instructions ====");
    console.log("1. Go to your Safe UI: " + getSafeWebUrl(network.name, CONFIG.safeAddress));
    console.log("2. Create the implementation transaction first (use above details)");
    console.log("3. Set at least 1,500,000 gas for implementation deployment");
    console.log("4. Execute and wait for confirmation");
    console.log("5. Create the proxy transaction (only after implementation is deployed)");
    console.log("6. Set at least 1,000,000 gas for proxy deployment");

    // Include full data for reference
    console.log("\n==== Full Transaction Data for Reference ====");
    console.log("Implementation Transaction Data:");
    console.log(implDeployCalldata);
    console.log("\nProxy Transaction Data:");
    console.log(proxyDeployCalldata);
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });