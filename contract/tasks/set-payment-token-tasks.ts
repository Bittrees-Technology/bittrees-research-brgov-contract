import { task, types } from "hardhat/config";
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
 * The Technology Multisig adds a new active paymentToken with the given unitPrice.
 * */
task(
    "technology-add-new-active-payment-token",
    "Bittrees Technology Multisig sets a new token which can pay for minting BNotes"
)
    .addParam("tokenAddress", "The contract address of the payment token")
    .addParam(
        'priceInMajorUnits',
        "The price in token major units (e.g., '10' for 10 tokens)",
        undefined,
        types.float
    )
    .addParam(
        'priceInMinorUnits',
        "The price in token minor units (e.g., '10000000000000000000' for 10 tokens with 18 decimals)",
        undefined,
        types.bigint
    )
    .addFlag("dryRun", "Only show transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            priceInMajorUnits,
            priceInMinorUnits,
            dryRun
        } = taskArgs;

        await hre.run('set-payment-token', {
            tokenAddress,
            priceInMajorUnits,
            priceInMinorUnits,
            active: true,
            mode: 'add',
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig adds a new active paymentToken with the given unitPrice.
 * */
task(
    "research-add-new-active-payment-token",
    "Bittrees Research Multisig sets a new token which can pay for minting BNotes"
)
    .addParam("tokenAddress", "The contract address of the payment token")
    .addParam(
        'priceInMajorUnits',
        "The price in token major units (e.g., '10' for 10 tokens)",
        undefined,
        types.float
    )
    .addParam(
        'priceInMinorUnits',
        "The price in token minor units (e.g., '10000000000000000000' for 10 tokens with 18 decimals)",
        undefined,
        types.bigint
    )
    .addFlag("dryRun", "Only show transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            priceInMajorUnits,
            priceInMinorUnits,
            dryRun
        } = taskArgs;

        await hre.run('set-payment-token', {
            tokenAddress,
            priceInMajorUnits,
            priceInMinorUnits,
            active: true,
            mode: 'add',
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });

function tokenModeType(argName: string) {
    return {
        name: "token-mode",
        parse: (rawValue: string) => {
            const value = rawValue.toLowerCase();
            if (value !== "add" && value !== "update") {
                throw new Error(`Invalid value for ${argName}. Must be either "add" or "update"`);
            }
            return value;
        },
        validate: (value: unknown): boolean => {
            return typeof value === "string" && (value === "add" || value === "update");
        }
    };
}

/**
 * Generalized Task for setting payment tokens accepted in exchange for minting BNotes
 * */
task("set-payment-token", "Sets the payment token accepted in exchange for minting BNotes")
    .addParam("tokenAddress", "The contract address of the payment token")
    .addParam(
        'active',
        'Boolean determining if the payment token can be use',
        undefined,
        types.boolean,
    )
    .addParam(
        'priceInMajorUnits',
        "The price in token major units (e.g., '10' for 10 tokens)",
        undefined,
        types.float
    )
    .addParam(
        'priceInMinorUnits',
        "The price in token minor units (e.g., '10000000000000000000' for 10 tokens with 18 decimals)",
        undefined,
        types.bigint
    )
    .addParam('mode', "Mode of operation: 'add' for new token, 'update' for existing", undefined, tokenModeType('mode'))
    .addParam(
        "from",
        "The address calling the contract to set the payment token",
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag("dryRun", "Only show transaction data without submitting")
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            priceInMajorUnits,
            priceInMinorUnits,
            active,
            mode,
            from,
            dryRun,
        } = taskArgs;

        if (tokenAddress === hre.ethers.ZeroAddress) {
            throw new Error(`Token Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Setting Payment Token ====`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`Price in Major Units: ${priceInMajorUnits}`);
        console.log(`Price in Minor Units: ${priceInMinorUnits}`);
        console.log(`Active: ${active}`);
        console.log(`Mode: ${mode}`);

        const { BNote__factory, ERC20__factory } = require('../typechain-types');
        const tokenContract = ERC20__factory.connect(tokenAddress, hre.ethers.provider);
        let decimals;
        try {
            decimals = await tokenContract.decimals();
            console.log(`Token decimals: ${decimals}`);
        } catch (e: any) {
            console.error(`Failed to get decimals from token contract. Error: ${e.message}`);
            throw new Error("Token contract doesn't seem to be a valid ERC20 with decimals() function");
        }

        // Calculate expected minor units from major units
        const expectedMinorUnits = hre.ethers.parseUnits(
            priceInMajorUnits.toString(),
            decimals
        );

        // Compare the provided minor units with the calculated value
        if (expectedMinorUnits !== priceInMinorUnits) {
            throw new Error(
                `Major and minor units don't match.\n` +
                `${priceInMajorUnits} tokens with ${decimals} decimals should be ${expectedMinorUnits}, ` +
                `but ${priceInMinorUnits} was provided.`
            );
        }


        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);

        const fromAddressHasRole = await hasAdminRole(bNote, from);

        if (!fromAddressHasRole) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${from}) does not have the ADMIN_ROLE.`
                + `Attempting to set-payment-token with this address will revert onchain and waste gas!`
            )
            throw new Error(
                'Sender Not Authorized with ADMIN_ROLE On Contract'
            )
        }

        const paymentTokenExists = await bNote.paymentTokenExists(tokenAddress);

        if (paymentTokenExists && mode === 'add') {
            throw new Error(
                'Cannot add a payment token that already exists.'
            )
        }

        if (!paymentTokenExists && mode === 'update') {
            throw new Error(
                'Cannot update a payment token that does not exist.'
            );
        }

        if (priceInMinorUnits === 0n) {
            throw new Error(
                'Cannot set price to zero. This would allow free minting of BNotes'
            )
        }

        const txData = bNote.interface.encodeFunctionData(
            "setPaymentToken",
            [tokenAddress, active, priceInMinorUnits]
        );

        const transactions = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Set Payment Token Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with setting the paymentToken with address(${
                tokenAddress
            }) to active(${
                active
            }) with a priceInMinorUnits(${
                priceInMinorUnits
            }) and priceInMajorUnits(${
                priceInMajorUnits
            })?`
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });