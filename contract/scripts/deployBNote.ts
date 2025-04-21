import { ethers, network } from 'hardhat';
import { CONFIG } from "./utils/config";
import fs from "fs";
import {
    calculateCreate2Address,
    generateCompatibleSalt,
    encodeCreate2FactoryDeploymentTxData,
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
} from './utils/helpers';

async function main() {
    if(CONFIG.create2FactoryCallerAddress !== CONFIG.bittreesTechnologyGnosisSafeAddress) {
        const question =
            `⚠️Configured create2FactoryCallerAddress address(${
                CONFIG.create2FactoryCallerAddress
            }) does not match the bittreesTechnologyGnosisSafeAddress address(${
                CONFIG.bittreesTechnologyGnosisSafeAddress
            })!`
            + `\n⚠️If this is for an official deployment, abort and set the value`
            + ` appropriately in the .env file.`
            + `\n⚠️Otherwise, enter 'yes' to continue:`
        await askForConfirmation(question);
    } else {
        console.log(
            `\n✅create2FactoryCallerAddress matches the bittreesTechnologySafe address: ${
                CONFIG.create2FactoryCallerAddress
            }`
        );
    }

    console.log(`\nNetwork: ${network.name}`);
    console.log("==== BNote Deployment Information ====");

    // Generate deterministic salt from project name
    const implSalt = generateCompatibleSalt(CONFIG.create2FactoryCallerAddress, `${CONFIG.projectName}`);
    console.log(`\nImplementation Salt Text: ${CONFIG.projectName}`);
    console.log(`Implementation Salt (hex): ${implSalt}`);

    // Get contract factories
    const BNoteFactory = await ethers.getContractFactory("BNote");
    const ProxyFactory = await ethers.getContractFactory("ERC1967Proxy");

    // Get implementation bytecode
    const implementationBytecode = BNoteFactory.bytecode;

    // Calculate implementation address
    const implAddress = calculateCreate2Address(
        CONFIG.gnosisCreate2FactoryAddress,
        implSalt,
        implementationBytecode
    );

    console.log("\n==== Implementation Contract ====");
    console.log("Implementation Bytecode Length:", implementationBytecode.length / 2 - 1, "bytes");
    console.log("Implementation Address (via CREATE2):", implAddress);

    // Encode initialization call for the proxy
    const initData = BNoteFactory.interface.encodeFunctionData("initialize", [
        CONFIG.initialBaseURI,
        CONFIG.initialAdminAndDefaultAdminAddress
    ]);

    // Encode proxy constructor arguments
    const proxyCreationCode = ProxyFactory.bytecode +
        ProxyFactory.interface.encodeDeploy([implAddress, initData]).slice(2);

    // Calculate proxy address
    const proxySalt = generateCompatibleSalt(CONFIG.create2FactoryCallerAddress, `${CONFIG.projectName}`);
    console.log(`\nProxy Salt Text: ${CONFIG.projectName}`);
    console.log(`Compatible Proxy Salt (hex): ${proxySalt}`);

    const proxyAddress = calculateCreate2Address(
        CONFIG.gnosisCreate2FactoryAddress,
        proxySalt,
        proxyCreationCode
    );

    console.log("\n==== Proxy Contract ====");
    console.log("Proxy Creation Bytecode Length:", proxyCreationCode.length / 2 - 1, "bytes");
    console.log("Proxy Salt:", proxySalt);
    console.log("Proxy Address (via CREATE2):", proxyAddress);
    console.log("This will be the main contract address for BNote");

    // Save deployment data to file
    const deploymentData = {
        network: network.name,
        implementationSalt: implSalt,
        proxySalt: proxySalt,
        create2Factory: CONFIG.gnosisCreate2FactoryAddress,
        'implementationV2.0.0': {
            bytecode: implementationBytecode,
            address: implAddress,
        },
        currentImplementation: 'implementationV2.0.0',
        proxy: {
            bytecode: proxyCreationCode,
            address: proxyAddress,
            proxyArgs: [
                implAddress,
                initData
            ]
        },
        config: {
            baseURI: CONFIG.initialBaseURI,
            initialAdminAddress: CONFIG.initialAdminAndDefaultAdminAddress,
        }
    };

    const outputFile = `./deployments/bnote-deployment-${network.name}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));
    console.log(`\nDeployment data saved to ${outputFile}`);

    console.log("\n==== Transaction Information ====");

    // Check if code exists at implementation address
    const implCodeSize = await ethers.provider.getCode(implAddress).then(c => c.length);
    if (implCodeSize > 2) { // More than just '0x'
        console.log(`\n⚠️ Implementation already deployed at ${implAddress}`);
    }

    // Check if code exists at proxy address
    const proxyCodeSize = await ethers.provider.getCode(proxyAddress).then(c => c.length);
    if (proxyCodeSize > 2) { // More than just '0x'
        console.log(`\n⚠️ Proxy already deployed at ${proxyAddress}`);
    }

    // Encode implementation deployment call
    const implDeployCalldata = encodeCreate2FactoryDeploymentTxData(implSalt, implementationBytecode);

    // Encode proxy deployment call
    const proxyDeployCalldata = encodeCreate2FactoryDeploymentTxData(proxySalt, proxyCreationCode);

    const transactions = [{
        to: CONFIG.gnosisCreate2FactoryAddress,
        value: '0',
        data: implDeployCalldata,
        transactionInfoLog: '\n==== Implementation Transaction ====',
    }, {
        to: CONFIG.gnosisCreate2FactoryAddress,
        value: '0',
        data: proxyDeployCalldata,
        transactionInfoLog: '\n==== Proxy Transaction (execute after implementation) ====',
    }]

    if(CONFIG.proposeTxToSafe) {
        await proposeTxBundleToSafe(transactions, CONFIG.create2FactoryCallerAddress);
    } else {
        logTransactionDetailsToConsole(transactions);
    }
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });