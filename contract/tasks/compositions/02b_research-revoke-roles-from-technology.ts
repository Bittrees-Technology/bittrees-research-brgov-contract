import { task } from 'hardhat/config';
import { CONFIG } from '../../config';
import {
    logTransactionDetailsToConsole,
    proposeTxBundleToSafe,
} from '../../lib/helpers';
import { transactionBatch } from '../../lib/tx-batch';

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
    'research-revoke-roles-on-bnote-from-technology',
    'Research Multisig takes away ownership of the BNote contract from the Technology Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;
        const from = CONFIG.bittreesTechnologyGnosisSafeAddress;

        // 12_b. Research Multisig revokes DEFAULT_ADMIN_ROLE & ADMIN_ROLE from Technology Multisig: (REQUIRED - alternatively do step 12_a)
        await hre.run('research-revoke-default-admin-role-from-technology', { dryRun: true });

        await hre.run('research-revoke-admin-role-from-technology', { dryRun: true });

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactionBatch);
        } else {
            await proposeTxBundleToSafe(hre, transactionBatch, from);
        }
    });