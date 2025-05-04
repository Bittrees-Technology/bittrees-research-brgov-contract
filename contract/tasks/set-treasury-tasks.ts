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
 * The Technology Multisig sets the treasury to the Bittrees Research Multisig.
 * */
task(
    'technology-set-treasury-to-research',
    'Bittrees Technology Multisig sets treasury to the Bittrees Research Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('set-treasury', {
            treasuryAddress: CONFIG.bittreesResearchGnosisSafeAddress,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });


/**
 * Generalized Task for setting the treasury to the given addresses
 * */
task('set-treasury', 'Sets the treasury to a given address')
    .addParam('treasuryAddress', 'The address to set the treasury to')
    .addParam(
        'from',
        'The address calling the contract to set the treasury address',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            treasuryAddress,
            from,
            dryRun,
        } = taskArgs;

        if (treasuryAddress === hre.ethers.ZeroAddress) {
            throw new Error(`Treasury Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Setting Treasury to Address ====`);
        console.log(`Address: ${treasuryAddress}`);

        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const { BNote__factory } = require('../typechain-types');
        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasAdminRole(bNote, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to set-treasury with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract',
            );
        }

        const txData: string = bNote.interface.encodeFunctionData(
            'setTreasury',
            [treasuryAddress],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Set Treasury Address Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with setting the treasury address to address(${treasuryAddress})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });