import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress,
    hasRole,
    contractNameParam, getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

/**
 * Generalized Task for renouncing roles an address has
 * */
task('renounce-role', 'Allows an address to renounce a role it currently has')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
    .addParam('role', 'The role being renounced (ADMIN_ROLE, DEFAULT_ADMIN_ROLE, etc.)')
    .addParam('callerConfirmation', 'The address of the caller renouncing their role')
    .addParam(
        'from',
        'The address calling the contract to renounce the role from itself - should match the callerConfirmation param',
    )
    .addParam(
        'addressRetainingRole',
        'An address retaining the roll - ensures a role is not left with no address that has it after renouncing',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            contractName,
            role,
            addressRetainingRole,
            from,
            callerConfirmation,
            dryRun,
        } = taskArgs;

        if (callerConfirmation === hre.ethers.ZeroAddress) {
            throw new Error(`callerConfirmation provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`from provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (addressRetainingRole === hre.ethers.ZeroAddress) {
            throw new Error(`addressRetainingRole provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from !== callerConfirmation) {
            throw new Error(
                `address(${
                    callerConfirmation
                }) provided does not match the from(${
                    from
                }) provided. Roles can only be renounced by an address which already has them.`
                + 'This transaction would fail onchain and consume gas.'
                + 'If you want to remove a roll from a different address that will execute this'
                + 'transaction, use one of the renounce-role tasks instead. Aborting...',
            );
        }

        if (addressRetainingRole === callerConfirmation || addressRetainingRole === from) {
            throw new Error(
                'addressRetainingRole matches callerConfirmation/from addresses.'
                + ' addressRetainingRole should differ, as it is used to ensure some address'
                + ' will still have the role being renounced by the callerConfirmation/from address'
                + ' after execution. Aborting...',
            );
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Renouncing ${role} from Address ====`);
        console.log(`Address: ${from}`);

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

        const fromAddressHasRole = await hasRole(contract, roleHash, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the role(${role}).`
                + `Attempting to renounce-role with this address will revert onchain and waste gas!`,
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
                + `Attempting to renounce-role with address(${from}) could leave nobody with the roll!`
                + `For some roles this could leave the role as irrecoverable!`,
            );
            throw new Error(
                `Provide an address which has the role(${role}) to the addressRetainingRole parameter`
                + 'to ensure we do not lock ourselves out.',
            );
        }

        const txData: string = contract.interface.encodeFunctionData(
            'renounceRole',
            [roleHash, callerConfirmation],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Renounce ${role} Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with renouncing ${role} to address(${callerConfirmation})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });