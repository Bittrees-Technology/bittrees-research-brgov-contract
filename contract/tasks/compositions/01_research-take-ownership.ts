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
 * The Research Multisig grants the ADMIN_ROLE to itself. After this the Research
 * Multisig can unpause the contract, proving that it has the ADMIN_ROLE(required
 * to pause/unpause the contract) and that it has the DEFAULT_ADMIN_ROLE(successfully
 * granted itself ADMIN_ROLE)
 * */
task(
    'research-take-bnote-ownership',
    'Research Multisig takes ownership over the BNote contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;
        const from = CONFIG.bittreesResearchGnosisSafeAddress;


        const { isTestnet } = CONFIG.network[
            hre.network.name as keyof typeof CONFIG.network
            ];

        // 8. Research Multisig grants ADMIN_ROLE to the itself: (REQUIRED)
        await hre.run('research-grant-admin-role-to-itself', {
            dryRun: true,
            omitDefensiveChecks: true,
        });

        //  9. Research Multisig unpauses contract so minting can resume: (REQUIRED if step 4 was used)
        await hre.run('research-unpause-bnote-minting', {
            dryRun: true,
            omitDefensiveChecks: true,
        });

        if (isTestnet) {
            // 10. Technology Multisig approves BNote contract to spend sufficient BTREE it holds: (OPTIONAL)
            await hre.run('research-approve-bnote-to-spend-btree', { dryRun: true });

            // 11. Research Multisig mints tokens to the treasury(itself): (OPTIONAL - requires step 10 to have been carried out)
            await hre.run('research-mint-batch-test', {
                dryRun: true,
                omitDefensiveChecks: true,
            });
        }

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactionBatch);
        } else {
            await proposeTxBundleToSafe(hre, transactionBatch, from);
        }
    });