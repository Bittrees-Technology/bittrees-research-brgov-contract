import { task } from 'hardhat/config';
import { CONFIG } from '../config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getBNoteProxyAddress,
    hasDefaultAdminRole,
} from '../lib/helpers';
import { transactionBatch, TTransaction } from '../lib/tx-batch';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig grants the DEFAULT_ADMIN_ROLE to the Bittrees Research
 * Multisig. After this the Research Multisig can grant other roles to itself to
 * confirm it is working correctly.
 * */
task(
    'technology-grant-default-admin-role-to-research',
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
    'research-grant-admin-role-to-itself',
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
            role: 'ADMIN_ROLE',
            address: CONFIG.bittreesResearchGnosisSafeAddress,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });

/**
 * Generalized Task for granting roles to addresses
 * */
task('grant-role', 'Grants a role to an address')
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

        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const { BNote__factory } = require('../typechain-types');
        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasDefaultAdminRole(bNote, from);

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
            roleHash = await bNote.DEFAULT_ADMIN_ROLE();
        } else if (role === 'ADMIN_ROLE') {
            roleHash = await bNote.ADMIN_ROLE();
        } else {
            throw new Error(`Unknown role: ${role}. Please use DEFAULT_ADMIN_ROLE or ADMIN_ROLE.`);
        }

        const txData: string = bNote.interface.encodeFunctionData(
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