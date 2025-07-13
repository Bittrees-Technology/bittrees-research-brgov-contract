import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig renounces the DEFAULT_ADMIN_ROLE from itself. This
 * should only be run once the role has been granted to another address and is
 * confirmed to be working as expected.
 * */
task(
    'BIT-technology-renounce-default-admin-role',
    'Bittrees Technology Multisig renounces the DEFAULT_ADMIN_ROLE from itself',
)
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after it is revoked',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { addressRetainingRole, dryRun } = taskArgs;

        await hre.run('renounce-role', {
            contractName: BittreesResearchContractNames.BIT,
            role: 'DEFAULT_ADMIN_ROLE',
            callerConfirmation: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun: dryRun,
            addressRetainingRole,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig renounces the ADMIN_ROLE from itself. This should only
 * be run once the role has been granted to another address and is confirmed to
 * be working as expected.
 * */
task(
    'BIT-technology-renounce-admin-role',
    'Bittrees Technology Multisig renounces the ADMIN_ROLE from itself',
)
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after it is revoked',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { addressRetainingRole, dryRun } = taskArgs;

        await hre.run('renounce-role', {
            contractName: BittreesResearchContractNames.BIT,
            role: 'ADMIN_ROLE',
            callerConfirmation: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun: dryRun,
            addressRetainingRole,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
        });
    });