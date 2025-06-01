import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress,
    hasAdminRole, contractNameParam, getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

/**
 * Generalized Task for unpausing the specified contract
 * */
task('unpause', 'Unpauses the specified contract')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
    .addParam(
        'from',
        'The address calling the contract to unpause the contract. Must have the ADMIN_ROLE',
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
            from,
            dryRun,
            omitDefensiveChecks,
        } = taskArgs;

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Unpausing Minting on the BNote Contract ====`);

        const proxyAddress = await getContractProxyAddress(contractName, hre.network.name);

        const contract = await getBittreesResearchContract(contractName, proxyAddress, hre);

        const fromAddressHasRole = await hasAdminRole(contract, from);

        if (!fromAddressHasRole && !omitDefensiveChecks) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to unpause-bnote-minting with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract',
            );
        }

        const isUnpaused = !(await contract.paused());

        if (isUnpaused && !omitDefensiveChecks) {
            throw new Error(
                'Minting is already unpaused on the BNote contract',
            );
        }

        const txData: string = contract.interface.encodeFunctionData('unpause');

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Unpause Minting on BNote Transaction ====`,
        }];

        await askForConfirmation(
            'Do you want to proceed with unpausing minting on the BNote contract?',
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });