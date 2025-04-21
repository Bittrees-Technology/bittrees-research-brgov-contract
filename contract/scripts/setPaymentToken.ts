import { ethers, network } from 'hardhat';
import { CONFIG } from "./utils/config";
import { BNote__factory } from '../typechain-types';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
} from './utils/helpers';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

async function main() {
    // Parse command line arguments
    const argv = await yargs(hideBin(process.argv))
        .option('token', {
            alias: 't',
            description: 'Token address to add as payment token',
            type: 'string',
            demandOption: true
        })
        .option('active', {
            alias: 'a',
            description: 'Set token as active (true) or inactive (false)',
            type: 'boolean',
            default: true
        })
        .option('price', {
            alias: 'p',
            description: 'Mint price in token minor units (e.g., "1000000000000000000" for 1 unit of an 18-decimal token)',
            type: 'string',
            demandOption: true
        })
        .option('dryRun', {
            description: 'Only show transaction data without submitting',
            type: 'boolean',
            default: false
        })
        .help()
        .alias('help', 'h')
        .parse();

    const tokenAddress = argv.token;
    const isActive = argv.active;
    const mintPrice = ethers.getBigInt(argv.price);
    const isDryRun = argv.dryRun;

    console.log(`\nNetwork: ${network.name}`);
    console.log("==== Setting Payment Token ====");
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Active: ${isActive}`);
    console.log(`Raw Mint Price: ${mintPrice.toString()} (token minor units)`);

    // Get deployment file to find contract address
    let proxyAddress;
    try {
        const deploymentFile = require(`../bnote-deployment-${network.name}.json`);
        proxyAddress = deploymentFile.proxy.address;
    } catch (e) {
        console.error(`Could not find deployment file for network ${network.name}`);
        console.error(`Please ensure you've deployed the contract first`);
        return;
    }

    console.log(`\nConnecting to BNote at: ${proxyAddress}`);

    // Create contract instance
    const bNote = BNote__factory.connect(proxyAddress, ethers.provider);

    // Create transaction data
    const txData = bNote.interface.encodeFunctionData(
        "setPaymentToken",
        [tokenAddress, isActive, mintPrice]
    );

    const transactions = [{
        to: proxyAddress,
        value: '0',
        data: txData,
        transactionInfoLog: '\n==== Set Payment Token Transaction ====',
    }];

    await askForConfirmation(`Do you want to proceed with setting the payment token with price ${mintPrice.toString()}?`);

    if (isDryRun || !CONFIG.proposeTxToSafe) {
        logTransactionDetailsToConsole(transactions);
    } else {
        await proposeTxBundleToSafe(transactions, CONFIG.create2FactoryCallerAddress);
    }
}

// Execute the script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });