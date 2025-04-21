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
import { ZeroAddress } from 'ethers';

async function main() {
    // Parse command line arguments
    const argv = await yargs(hideBin(process.argv))
        .option('dryRun', {
            description: 'Only show transaction data without submitting',
            type: 'boolean',
            default: false
        })
        .help()
        .alias('help', 'h')
        .parse();

    const isDryRun = argv.dryRun;
    const adminAddress = CONFIG.adminAddress;

    if (adminAddress === ZeroAddress) {
        throw new Error(
            `adminAddress(${
                adminAddress
            }) provided is ZeroAddress. This is almost definitely a mistake. Aborting...`
        )
    }

    console.log(`\nNetwork: ${network.name}`);
    console.log("==== Granting ADMIN_ROLE to Address ====");
    console.log(`Admin Address: ${adminAddress}`);

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
        "grantRole",
        ["ADMIN_ROLE", adminAddress]
    );

    const transactions = [{
        to: proxyAddress,
        value: '0',
        data: txData,
        transactionInfoLog: '\n==== Grant ADMIN_ROLE Transaction ====',
    }];

    await askForConfirmation(
        `Do you want to proceed with granting the ADMIN_ROLE to address(${adminAddress})?`
    );

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