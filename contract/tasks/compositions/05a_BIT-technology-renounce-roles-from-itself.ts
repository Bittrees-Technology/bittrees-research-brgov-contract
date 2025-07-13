import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    logTransactionDetailsToConsole,
    proposeTxBundleToSafe,
} from '@project/lib/helpers';
import { transactionBatch } from '@project/lib/tx-batch';

/**
 * Contract Configuration Composition Task
 *
 * The Technology Multisig renounces the ADMIN_ROLE and DEFAULT_ADMIN_ROLE from
 * itself.
 *
 * NB: ONLY RUN AND EXECUTE THIS TASK AFTER RESEARCH MULTISIG HAS SUCCESSFULLY
 * RUN AND EXECUTED THE TASK 01 AND THE TX BUNDLE IT CREATED ON THE MULTISIG
 * */
task(
    'BIT-technology-renounce-roles',
    'Technology Multisig gives up ownership of the Bit contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;
        const from = CONFIG.bittreesTechnologyGnosisSafeAddress;


        // 13_a. Technology Multisig renounces DEFAULT_ADMIN_ROLE & ADMIN_ROLE: (REQUIRED - alternatively do step 12_b)
        await hre.run('BIT-technology-renounce-default-admin-role', { dryRun: true });

        await hre.run('BIT-technology-renounce-admin-role', { dryRun: true });

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactionBatch);
        } else {
            await proposeTxBundleToSafe(hre, transactionBatch, from);
        }
    });