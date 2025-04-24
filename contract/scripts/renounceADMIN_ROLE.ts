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
        .option('remainingAdminAddress', {
            alias: 'a',
            description: 'Address which will still have the ADMIN_ROLE after the CONFIG.initialAdminAndDefaultAdminAddress renounces the ADMIN_ROLE',
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

    const remainingAdminAddress = argv.remainingAdminAddress;
    const isDryRun = argv.dryRun;
    const initialAdminAddress = CONFIG.initialAdminAndDefaultAdminAddress;

    if (initialAdminAddress === ZeroAddress) {
        throw new Error(
            `adminAddress(${
                initialAdminAddress
            }) provided is ZeroAddress. This is almost definitely a mistake. Aborting...`
        )
    }

    if (remainingAdminAddress === ZeroAddress) {
        throw new Error(
            `adminAddress(${
                remainingAdminAddress
            }) provided is ZeroAddress. This is almost definitely a mistake. Aborting...`
        )
    }

    console.log(`\nNetwork: ${network.name}`);
    console.log("==== Renouncing ADMIN_ROLE to Address ====");
    console.log(`Admin Address: ${initialAdminAddress}`);

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

    const ADMIN_ROLE = await bNote.ADMIN_ROLE();
    const remainingAdminHasAdminRole = await bNote.hasRole(ADMIN_ROLE, remainingAdminAddress);

    if (!remainingAdminHasAdminRole) {
        throw new Error(
            'given remainingAdminAddress does not have the ADMIN_ROLE role. Please provide an address which has the role to ensure we do not lock ourselves out'
        );
    }

    // Create transaction data
    const txData = bNote.interface.encodeFunctionData(
        "renounceRole",
        ["ADMIN_ROLE", initialAdminAddress]
    );

    const transactions = [{
        to: proxyAddress,
        value: '0',
        data: txData,
        transactionInfoLog: '\n==== Renounce ADMIN_ROLE Transaction ====',
    }];

    await askForConfirmation(
        `Do you want to proceed with renouncing the ADMIN_ROLE to address(${initialAdminAddress})?`
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