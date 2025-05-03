import { task } from "hardhat/config";
import { CONFIG } from "../config";
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getBNoteProxyAddress,
    hasAdminRole,
} from '../lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Technology Multisig pauses minting on the BNote contract
 * */
task(
    "technology-pause-bnote-minting",
    "Bittrees Technology Multisig pauses minting on the BNote contract"
)
    .addFlag("dryRun", "Return and log transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause-bnote-minting', {
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        })
    });

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Research Multisig pauses minting on the BNote contract
 * */
task(
    "research-pause-bnote-minting",
    "Bittrees Research Multisig pauses minting on the BNote contract"
)
    .addFlag("dryRun", "Return and log transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause-bnote-minting', {
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        })
    });

/**
 * Generalized Task for pausing minting on the BNote contract
 * */
task("pause-bnote-minting", "Pauses minting on the BNote contract")
    .addParam(
        "from",
        "The address calling the contract to pause minting. Must have the ADMIN_ROLE",
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag("dryRun", "Return and log transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const {
            from,
            dryRun,
        } = taskArgs;

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Pausing Minting on the BNote Contract ====`);

        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const { BNote__factory } = require('../typechain-types');
        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasAdminRole(bNote, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to pause-bnote-minting with this address will revert onchain and waste gas!`
            )
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract'
            )
        }

        const isPaused = await bNote.paused();

        if(isPaused) {
            throw new Error(
                'Minting is already paused on the BNote contract'
            )
        }

        const txData = bNote.interface.encodeFunctionData("pause");

        const transactions = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Pause Minting on BNote Transaction ====`,
        }];

        await askForConfirmation(
            'Do you want to proceed with pausing minting on the BNote contract?'
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            return transactions;
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });