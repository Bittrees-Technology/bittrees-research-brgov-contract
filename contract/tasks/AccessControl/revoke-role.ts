import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress,
    hasRole, hasDefaultAdminRole, contractNameParam, getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

/**
 * Generalized Task for revoking roles an address has
 * */
task('revoke-role', 'Allows an address with DEFAULT_ADMIN_ROLE to revoke a role from another address')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
    .addParam('role', 'The role being revoked (ADMIN_ROLE, DEFAULT_ADMIN_ROLE, etc.)')
    .addParam('addressWithRole', 'The address from which the role is being revoked')
    .addParam('from', 'The address calling the contract to revoke the role from addressWithRole')
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after it is revoked from addessWithRole',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            contractName,
            role,
            addressWithRole,
            addressRetainingRole,
            from,
            dryRun,
        } = taskArgs;

        if (addressWithRole === hre.ethers.ZeroAddress) {
            throw new Error(`addressWithRole provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`from provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (addressRetainingRole === hre.ethers.ZeroAddress) {
            throw new Error(`addressRetainingRole provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === addressWithRole) {
            throw new Error(
                `address(${
                    addressWithRole
                }) provided matches the from(${
                    from
                }) provided. Roles should only be revoked using an addressWithRoll other than the caller.`
                + 'Either provide an address other than the caller from whom you wish to revoke a call, '
                + 'or use renounce-role tasks instead to have an address remove a role from itself. Aborting...',
            );
        }

        if (addressRetainingRole === addressWithRole) {
            throw new Error(
                'addressRetainingRole address matches addressWithRole address.'
                + ' addressRetainingRole should differ, as it is used to ensure some address'
                + ' will still have the role after the role has been revoke from the addressWithRole address'
                + ' after execution. Aborting...',
            );
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Revoking ${role} from Address ====`);
        console.log(`Address: ${addressWithRole}`);

        const proxyAddress = await getContractProxyAddress(contractName, hre.network.name);

        const contract = await getBittreesResearchContract(contractName, proxyAddress, hre);


        // Get the role hash
        let roleHash;
        if (role === 'DEFAULT_ADMIN_ROLE') {
            roleHash = await contract.DEFAULT_ADMIN_ROLE();
        } else if (role === 'ADMIN_ROLE') {
            roleHash = await contract.ADMIN_ROLE();
        } else {
            throw new Error(`Unknown role: ${role}. Please use DEFAULT_ADMIN_ROLE or ADMIN_ROLE.`);
        }

        const fromAddressHasRole = await hasDefaultAdminRole(contract, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the DEFAULT_ADMIN_ROLE.`
                + `Attempting to revoke-role with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with DEFAULT_ADMIN_ROLE On Contract',
            );
        }

        const addressRetainingRoleHasRole = await hasRole(contract, roleHash, addressRetainingRole);

        if (!addressRetainingRoleHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as addressRetainingRole(${addressRetainingRole}) does not have the role(${role}).`
                + `Attempting to revoke-role from address(${addressWithRole}) could leave nobody with the roll!`
                + `For some roles this could leave the role as irrecoverable!`,
            );
            throw new Error(
                `Provide an address which has the role(${role}) to the addressRetainingRole parameter`
                + 'to ensure we do not lock ourselves out.',
            );
        }

        const txData: string = contract.interface.encodeFunctionData(
            'revokeRole',
            [roleHash, addressWithRole],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Revoke ${role} Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with revoking ${role} from address(${addressWithRole})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });