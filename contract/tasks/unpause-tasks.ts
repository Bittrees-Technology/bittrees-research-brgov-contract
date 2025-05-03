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
 * The Bittrees Technology Multisig unpauses minting on the BNote contract
 * */
task(
    "technology-unpause-bnote-minting",
    "Bittrees Technology Multisig unpauses minting on the BNote contract"
)
    .addFlag("dryRun", "Return and log transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('unpause-bnote-minting', {
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        })
    });

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Research Multisig unpauses minting on the BNote contract
 * */
task(
    "research-unpause-bnote-minting",
    "Bittrees Research Multisig unpauses minting on the BNote contract"
)
    .addFlag("dryRun", "Return and log transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('unpause-bnote-minting', {
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        })
    });

/**
 * Generalized Task for unpausing minting on the BNote contract
 * */
task("unpause-bnote-minting", "Unpauses minting on the BNote contract")
    .addParam(
        "from",
        "The address calling the contract to unpause minting. Must have the ADMIN_ROLE",
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
        console.log(`==== Unpausing Minting on the BNote Contract ====`);

        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const { BNote__factory } = require('../typechain-types');
        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasAdminRole(bNote, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to unpause-bnote-minting with this address will revert onchain and waste gas!`
            )
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract'
            )
        }

        const isUnpaused = ! (await bNote.paused());

        if(isUnpaused) {
            throw new Error(
                'Minting is already unpaused on the BNote contract'
            )
        }

        const txData = bNote.interface.encodeFunctionData("unpause");

        const transactions = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Unpause Minting on BNote Transaction ====`,
        }];

        await askForConfirmation(
            'Do you want to proceed with unpausing minting on the BNote contract?'
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            return transactions;
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });