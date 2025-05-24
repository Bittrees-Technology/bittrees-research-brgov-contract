import { task } from 'hardhat/config';
import { CONFIG } from '../config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getBNoteProxyAddress,
    hasAdminRole,
} from '../lib/helpers';
import { transactionBatch, TTransaction } from '../lib/tx-batch';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig sets the base URI on the BNote contract.
 * */
task(
    'technology-set-base-uri',
    'Bittrees Technology Multisig sets the base URI on the BNote contract.',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const networkName = hre.network.name;

        await hre.run('set-base-uri', {
            baseUri: CONFIG.network[networkName].baseURI,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig sets the base URI on the BNote contract.
 * */
task(
    'research-set-base-uri',
    'Bittrees Research Multisig sets the base URI on the BNote contract.',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const networkName = hre.network.name;

        await hre.run('set-base-uri', {
            baseUri: CONFIG.network[networkName].baseURI,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Generalized Task for setting the base URI on the BNote contract
 * */
task('set-base-uri', 'Sets the base URI on the BNote contract.')
    .addParam('baseUri', 'The base URI to set on the BNote contract')
    .addParam(
        'from',
        'The address calling the contract to set the treasury address',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            baseUri,
            from,
            dryRun,
        } = taskArgs;

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Setting Base URI ====`);
        console.log(`Base URI: ${baseUri}`);

        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const { BNote__factory } = require('../typechain-types');
        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasAdminRole(bNote, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to set-base-uri with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract',
            );
        }

        const txData: string = bNote.interface.encodeFunctionData(
            'setBaseURI',
            [baseUri],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Set Base URI Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with setting the base URI to (${baseUri})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });