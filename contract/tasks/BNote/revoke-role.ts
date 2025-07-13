import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig revokes the DEFAULT_ADMIN_ROLE from the Technology Multisig.
 * This should only be run once the role has been granted to another address and is
 * confirmed to be working as expected.
 * */
task(
    'BNOTE-research-revoke-default-admin-role-from-technology',
    'Bittrees Research Multisig revokes the DEFAULT_ADMIN_ROLE Bittrees Technology Multisig',
)
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after it is revoked',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { addressRetainingRole, dryRun } = taskArgs;

        await hre.run('revoke-role', {
            contractName: BittreesResearchContractNames.BNOTE,
            role: 'DEFAULT_ADMIN_ROLE',
            addressWithRole: CONFIG.bittreesTechnologyGnosisSafeAddress,
            addressRetainingRole,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig revokes the ADMIN_ROLE from the Technology Multisig.
 * This should only be run once the role has been granted to another address and
 * is confirmed to be working as expected.
 * */
task(
    'BNOTE-research-revoke-admin-role-from-technology',
    'Bittrees Research Multisig revokes the ADMIN_ROLE from Bittrees Technology Multisig',
)
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after it is revoked',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { addressRetainingRole, dryRun } = taskArgs;

        await hre.run('revoke-role', {
            contractName: BittreesResearchContractNames.BNOTE,
            role: 'ADMIN_ROLE',
            addressWithRole: CONFIG.bittreesTechnologyGnosisSafeAddress,
            addressRetainingRole,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });