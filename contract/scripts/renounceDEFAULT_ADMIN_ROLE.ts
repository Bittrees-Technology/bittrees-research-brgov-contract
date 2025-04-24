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
        .option('remainingDefaultAdminAddress', {
            alias: 'a',
            description: 'Address which will still have the DEFAULT_ADMIN_ROLE after the CONFIG.initialAdminAndDefaultAdminAddress renounces the DEFAULT_ADMIN_ROLE',
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

    const remainingDefaultAdminAddress = argv.remainingDefaultAdminAddress;
    const isDryRun = argv.dryRun;
    const initialDefaultAdminAddress = CONFIG.initialAdminAndDefaultAdminAddress;

    if (initialDefaultAdminAddress === ZeroAddress) {
        throw new Error(
            `adminAddress(${
                initialDefaultAdminAddress
            }) provided is ZeroAddress. This is almost definitely a mistake. Aborting...`
        )
    }

    if (remainingDefaultAdminAddress === ZeroAddress) {
        throw new Error(
            `adminAddress(${
                remainingDefaultAdminAddress
            }) provided is ZeroAddress. This is almost definitely a mistake. Aborting...`
        )
    }

    console.log(`\nNetwork: ${network.name}`);
    console.log("==== Renouncing DEFAULT_ADMIN_ROLE to Address ====");
    console.log(`Admin Address: ${initialDefaultAdminAddress}`);

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

    const DEFAULT_ADMIN_ROLE = await bNote.DEFAULT_ADMIN_ROLE();
    const remainingDefaultAdminHasAdminRole = await bNote.hasRole(DEFAULT_ADMIN_ROLE, remainingDefaultAdminAddress);

    if (!remainingDefaultAdminHasAdminRole) {
        throw new Error(
            'given remainingDefaultAdminAddress does not have the DEFAULT_ADMIN_ROLE role. Please provide an address which has the role to ensure we do not lock ourselves out'
        );
    }

    // Create transaction data
    const txData = bNote.interface.encodeFunctionData(
        "renounceRole",
        ["DEFAULT_ADMIN_ROLE", initialDefaultAdminAddress]
    );

    const transactions = [{
        to: proxyAddress,
        value: '0',
        data: txData,
        transactionInfoLog: '\n==== Renounce DEFAULT_ADMIN_ROLE Transaction ====',
    }];

    await askForConfirmation(
        `Do you want to proceed with renouncing the DEFAULT_ADMIN_ROLE to address(${initialDefaultAdminAddress})?`
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