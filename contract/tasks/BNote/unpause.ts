import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Technology Multisig unpauses the BNote contract
 * */
task(
    'BNOTE-technology-unpause',
    'Bittrees Technology Multisig unpauses the BNote contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const { dryRun, omitDefensiveChecks } = taskArgs;

        await hre.run('unpause', {
            contractName: BittreesResearchContractNames.BNOTE,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Research Multisig unpauses the BNote contract
 * */
task(
    'BNOTE-research-unpause',
    'Bittrees Research Multisig unpauses the BNote contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const { dryRun, omitDefensiveChecks } = taskArgs;

        await hre.run('unpause', {
            contractName: BittreesResearchContractNames.BNOTE,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });