import { task, types } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    getContractProxyAddress,
    logTransactionDetailsToConsole,
    proposeTxBundleToSafe,
    BittreesResearchContractNames,
} from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig approves the BNote contract to spend BTREE tokens. Required
 * for Technology Multisig to mint BNote tokens.
 * */
task(
    'technology-approve-bnote-to-spend-btree',
    'Bittrees Technology Multisig approves the BNote contract to spend BTREE tokens it owns',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const {
            contractAddress,
            priceInMajorUnits,
            priceInMinorUnits,
        } = CONFIG.network[
            hre.network.name as keyof typeof CONFIG.network
            ].paymentTokens.BTREE;

        // Assumes we are approving enough for a test mint of one of each token
        // denomination, IDs 1, 10, and 100
        const amountInMajorUnits = Number(priceInMajorUnits) * 111;
        const amountInMinorUnits = BigInt(priceInMinorUnits) * BigInt(111);

        await hre.run('approve-spender', {
            tokenAddress: contractAddress,
            amountInMinorUnits,
            amountInMajorUnits,
            spender: await getContractProxyAddress(BittreesResearchContractNames.BNOTE, hre.network.name),
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig approves the BNote contract to spend BTREE tokens. Required
 * for Research Multisig to mint BNote tokens.
 * */
task(
    'research-approve-bnote-to-spend-btree',
    'Bittrees Research Multisig approves the BNote contract to spend BTREE tokens it owns',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        const {
            contractAddress,
            priceInMajorUnits,
            priceInMinorUnits,
        } = CONFIG.network[
            hre.network.name as keyof typeof CONFIG.network
            ].paymentTokens.BTREE;

        // Assumes we are approving enough for a test mint of one of each token
        // denomination, IDs 1, 10, and 100
        const amountInMajorUnits = Number(priceInMajorUnits) * 111;
        const amountInMinorUnits = BigInt(priceInMinorUnits) * BigInt(111);

        await hre.run('approve-spender', {
            tokenAddress: contractAddress,
            amountInMinorUnits,
            amountInMajorUnits,
            spender: await getContractProxyAddress(BittreesResearchContractNames.BNOTE, hre.network.name),
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Generalized Task for granting roles to addresses
 * */
task('approve-spender', 'Approves an address to transfer an ERC20 on it\'s behalf')
    .addParam(
        'amountInMinorUnits',
        'The quantity (in minor units) which the spender is approved to spend',
        undefined,
        types.bigint,
    )
    .addParam(
        'amountInMajorUnits',
        'The quantity (in major units) which the spender is approved to spend',
        undefined,
        types.float,
    )
    .addParam('spender', 'The address to which spending authority is being delegated')
    .addParam('tokenAddress', 'The address of the token on which the spender is being given approval')
    .addParam('from', 'The address approving a spender of it\'s ERC20 tokens')
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            amountInMinorUnits,
            amountInMajorUnits,
            spender,
            from,
            dryRun,
        } = taskArgs;

        if (spender === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (tokenAddress === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Approving spender on ERC20 token  ====`);
        console.log(`From: ${from}`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`Spender: ${spender}`);
        console.log(`Amount in Major Units: ${amountInMajorUnits}`);
        console.log(`Amount in Minor Units: ${amountInMinorUnits}`);

        const { ERC20__factory } = require('@project/typechain-types');
        const tokenContract = ERC20__factory.connect(tokenAddress, hre.ethers.provider);
        let decimals;
        try {
            decimals = await tokenContract.decimals();
            console.log(`Token decimals: ${decimals}`);
        } catch (e: any) {
            console.error(`Failed to get decimals from token contract. Error: ${e.message}`);
            throw new Error('Token contract doesn\'t seem to be a valid ERC20 with decimals() function');
        }

        // Calculate expected minor units from major units
        const expectedMinorUnits = hre.ethers.parseUnits(
            amountInMajorUnits.toString(),
            decimals,
        );

        // Compare the provided minor units with the calculated value
        if (expectedMinorUnits !== amountInMinorUnits) {
            throw new Error(
                `Major and minor units don't match.\n` +
                `${amountInMajorUnits} tokens with ${decimals} decimals should be ${expectedMinorUnits}, ` +
                `but ${amountInMinorUnits} was provided.`,
            );
        }

        const txData = tokenContract.interface.encodeFunctionData(
            'approve',
            [spender, amountInMinorUnits],
        );

        const transactions = [{
            to: tokenAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Approve Spender address(${spender}) on token(${tokenAddress}) Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with approving spender(${
                spender
            }) on token address(${
                tokenAddress
            }) for amountInMajorUnits(${
                amountInMajorUnits
            })?`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
            return transactions;
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });