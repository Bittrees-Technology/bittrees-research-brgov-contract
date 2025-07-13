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
 * The Research Multisig revokes the ADMIN_ROLE and DEFAULT_ADMIN_ROLE from
 * the Technology Multisig.
 *
 * NB: ONLY RUN AND EXECUTE THIS TASK AFTER RESEARCH MULTISIG HAS SUCCESSFULLY
 * RUN AND EXECUTED THE TASK 01 AND THE TX BUNDLE IT CREATED ON THE MULTISIG
 * */
task(
    'BIT-research-revoke-roles-from-technology',
    'Research Multisig takes away ownership of the BIT contract from the Technology Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;
        const from = CONFIG.bittreesTechnologyGnosisSafeAddress;

        // 13_b. Research Multisig revokes DEFAULT_ADMIN_ROLE & ADMIN_ROLE from Technology Multisig: (REQUIRED - alternatively do step 12_a)
        await hre.run('BIT-research-revoke-default-admin-role-from-technology', { dryRun: true });

        await hre.run('BIT-research-revoke-admin-role-from-technology', { dryRun: true });

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactionBatch);
        } else {
            await proposeTxBundleToSafe(hre, transactionBatch, from);
        }
    });