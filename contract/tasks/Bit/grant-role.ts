import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig grants the DEFAULT_ADMIN_ROLE to the Bittrees Research
 * Multisig. After this the Research Multisig can grant other roles to itself to
 * confirm it is working correctly.
 * */
task(
    'BIT-technology-grant-default-admin-role-to-research',
    'Bittrees Technology Multisig grants DEFAULT_ADMIN_ROLE to the Bittrees Research Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const { dryRun, omitDefensiveChecks } = taskArgs;

        await hre.run('grant-role', {
            contractName: BittreesResearchContractNames.BIT,
            role: 'DEFAULT_ADMIN_ROLE',
            address: CONFIG.bittreesResearchGnosisSafeAddress,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig grants the ADMIN_ROLE to itself, confirming it has the
 * DEFAULT_ADMIN_ROLE. Requires that the `technology-grant-default-admin-role-to-research`
 * was already run and executed correctly.
 * */
task(
    'BIT-research-grant-admin-role-to-itself',
    'Bittrees Technology Multisig grants ADMIN_ROLE to the Bittrees Research Multisig',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const { dryRun, omitDefensiveChecks } = taskArgs;

        await hre.run('grant-role', {
            contractName: BittreesResearchContractNames.BIT,
            role: 'ADMIN_ROLE',
            address: CONFIG.bittreesResearchGnosisSafeAddress,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });