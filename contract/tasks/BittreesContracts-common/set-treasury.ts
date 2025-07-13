import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress,
    hasAdminRole,
    contractNameParam,
    getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

/**
 * Generalized Task for setting the treasury to the given addresses
 * */
task('set-treasury', 'Sets the treasury to a given address')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
    .addParam('treasuryAddress', 'The address to set the treasury to')
    .addParam(
        'from',
        'The address calling the contract to set the treasury address',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            contractName,
            treasuryAddress,
            from,
            dryRun,
        } = taskArgs;

        if (treasuryAddress === hre.ethers.ZeroAddress) {
            throw new Error(`Treasury Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Setting Treasury to Address ====`);
        console.log(`Address: ${treasuryAddress}`);

        const proxyAddress = await getContractProxyAddress(contractName, hre.network.name);

        const contract = await getBittreesResearchContract(contractName, proxyAddress, hre);

        const fromAddressHasRole = await hasAdminRole(contract, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to set-treasury with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract',
            );
        }

        const txData: string = contract.interface.encodeFunctionData(
            'setTreasury',
            [treasuryAddress],
        );

        const transactions: TTransaction[] = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Set Treasury Address Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with setting the treasury address to address(${treasuryAddress})?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });