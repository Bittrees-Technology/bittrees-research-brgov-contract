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
 * The Technology Multisig grants the DEFAULT_ADMIN_ROLE to the Bittrees Research
 * Multisig. After this the Research Multisig can grant ADMIN role to itself to
 * confirm it is working correctly.
 * */
task(
    'technology-configure-bnote-and-handover-to-research',
    'Technology Multisig configures the BNote contract and initiates handover to Research Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;
        const from = CONFIG.bittreesTechnologyGnosisSafeAddress;

        const network = CONFIG.network[
            hre.network.name as keyof typeof CONFIG.network
            ];
        const paymentTokens = network.paymentTokens;
        const isTestnet = network.isTestnet;

        // 1. Technology Multisig sets paymentTokens on the contract: (REQUIRED)
        // add each of the payment tokens listed in the config.ts file for the
        // network given in the task invocation
        for (const key in paymentTokens) {
            const {
                contractAddress: tokenAddress,
                priceInMajorUnits,
                priceInMinorUnits,
            } = paymentTokens[key as keyof typeof paymentTokens];

            await hre.run(
                'technology-add-new-active-payment-token',
                {
                    tokenAddress,
                    priceInMajorUnits: Number(priceInMajorUnits),
                    priceInMinorUnits: BigInt(priceInMinorUnits),
                    dryRun: true,
                });
        }

        // 2. Technology Multisig sets treasury on the contract: (REQUIRED)
        await hre.run('technology-set-treasury-to-research', {
                dryRun: true,
            },
        );

        if (isTestnet) {
            // 3. Technology Multisig approves BNote contract to spend sufficient BTREE it holds: (OPTIONAL)
            await hre.run('technology-approve-bnote-to-spend-btree', { dryRun: true });

            // 4. Technology Multisig mints tokens to the treasury: (OPTIONAL - requires step 3 to have been carried out)
            await hre.run('technology-mint-batch-test', {
                dryRun: true,
                omitDefensiveChecks: true,
            });
        }

        // 5. Technology Multisig pauses the contract: (OPTIONAL)
        await hre.run('technology-pause-bnote-minting', { dryRun: true });

        // 6. Skip Step 6 - won't execute in Safe if all is working correctly and
        // is a hassle to cancel onchain, wasting gas and getting in the way of
        // subsequent tx's and their nonces, or prevent the batch from executing
        // await hre.run('technology-mint-batch-test', { dryRun: true });


        // 7. Technology Multisig pauses the contract: (OPTIONAL)
        await hre.run('technology-grant-default-admin-role-to-research', { dryRun: true });

        // 8. Technology sets baseUri on the contract
        await hre.run('technology-set-base-uri', { dryRun: true });

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactionBatch);
        } else {
            await proposeTxBundleToSafe(hre, transactionBatch, from);
        }
    });