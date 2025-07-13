import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress,
    hasDefaultAdminRole,
    contractNameParam, getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

/**
 * Generalized Task for granting roles to addresses
 * */
task('grant-role', 'Grants a role to an address')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
    .addParam('role', 'The role to grant (ADMIN_ROLE, DEFAULT_ADMIN_ROLE, etc.)')
    .addParam('address', 'The address to grant the role to')
    .addParam(
        'from',
        'The address calling the contract to grant the role',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const {
            contractName,
            role,
            address,
            from,
            dryRun,
            omitDefensiveChecks,
        } = taskArgs;

        if (address === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Granting ${role} to Address ====`);
        console.log(`Address: ${address}`);

        const proxyAddress = await getContractProxyAddress(contractName, hre.network.name);

        const contract = await getBittreesResearchContract(contractName, proxyAddress, hre);

        const fromAddressHasRole = await hasDefaultAdminRole(contract, from);

        if (!fromAddressHasRole && !omitDefensiveChecks) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the DEFAULT_ADMIN_ROLE.`
                + `Attempting to grant-role with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with DEFAULT_ADMIN_ROLE On Contract',
            );
        }

        // Get the role hash
        let roleHash;
        if (role === 'DEFAULT_ADMIN_ROLE') {
            roleHash = await contract.DEFAULT_ADMIN_ROLE();
        } else if (role === 'ADMIN_ROLE') {
            roleHash = await contract.ADMIN_ROLE();
        } else {
            throw new Error(`Unknown role: ${role}. Please use DEFAULT_ADMIN_ROLE or ADMIN_ROLE.`);
        }

        const txData: string = contract.interface.encodeFunctionData(
            'grantRole',
            [roleHash, address],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Grant ${role} Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with granting ${role} to address(${address})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });