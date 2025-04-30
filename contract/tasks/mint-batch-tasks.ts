import { task, types } from 'hardhat/config';
import { CONFIG } from '../config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getBNoteProxyAddress,
} from '../lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig mints BNotes using the mintBatch function.
 * */
task(
    'technology-mint-batch-test',
    'Bittrees Technology Multisig mints BNotes using the mintBatch function',
)
    .addParam('tokenAddress', 'The address of the ERC20 token used for payment')
    .addParam(
        'tokenIds',
        'Comma-separated list of token IDs to mint',
        '1,10,100',
        types.string,
    )
    .addParam(
        'quantities',
        'Comma-separated list of quantities to mint for each token ID',
        '1,1,1',
        types.string,
    )
    .addFlag('dryRun', 'Only show transaction data without submitting')
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            tokenIds,
            quantities,
            dryRun,
        } = taskArgs;

        await hre.run('mint-batch', {
            tokenAddress,
            tokenIds,
            quantities,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig mints BNotes using the mintBatch function.
 * */
task(
    'research-mint-batch-test',
    'Bittrees Research Multisig mints BNotes using the mintBatch function',
)
    .addParam('tokenAddress', 'The address of the ERC20 token used for payment')
    .addParam(
        'tokenIds',
        'Comma-separated list of token IDs to mint',
        '1,10,100',
        types.string,
    )
    .addParam(
        'quantities',
        'Comma-separated list of quantities to mint for each token ID',
        '1,1,1',
        types.string,
    )
    .addFlag('dryRun', 'Only show transaction data without submitting')
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            tokenIds,
            quantities,
            dryRun,
        } = taskArgs;

        await hre.run('mint-batch', {
            tokenAddress,
            tokenIds,
            quantities,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Generalized Task for minting BNotes
 * */
task('mint-batch', 'Mints multiple BNotes in one transaction')
    .addParam('tokenAddress', 'The address of the ERC20 token used for payment')
    .addParam(
        'tokenIds',
        'Comma-separated list of token IDs to mint (valid values: 1, 10, 100)',
        undefined,
        types.string,
    )
    .addParam(
        'quantities',
        'Comma-separated list of quantities to mint for each token ID',
        undefined,
        types.string,
    )
    .addParam(
        'from',
        'The address calling the contract to mint tokens',
        CONFIG.bittreesResearchGnosisSafeAddress,
    )
    .addFlag('dryRun', 'Only show transaction data without submitting')
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress,
            tokenIds: tokenIdsString,
            quantities: quantitiesString,
            from,
            dryRun,
        } = taskArgs;

        if (tokenAddress === hre.ethers.ZeroAddress) {
            throw new Error(`Token Address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        if (from === hre.ethers.ZeroAddress) {
            throw new Error(`From address provided is ZeroAddress. This is almost definitely a mistake. Aborting...`);
        }

        // Parse comma-separated strings to arrays
        const tokenIds: number[] = tokenIdsString.split(',').map((id: string) => {
            return parseInt(id.trim());
        });
        const quantities: number[] = quantitiesString.split(',').map((quantity: string) => {
            return parseInt(quantity.trim());
        });

        // Validate arrays have same length
        if (tokenIds.length !== quantities.length) {
            throw new Error('TokenIds and quantities arrays must have the same length');
        }

        // Validate tokenIds (only 1, 10, 100 are valid currently)
        const validTokenIds = [1, 10, 100];
        tokenIds.forEach((id: number) => {
            if (!validTokenIds.includes(id)) {
                throw new Error(`Invalid tokenId: ${id}. Valid values are: 1, 10, 100`);
            }
        });

        console.log(`\nNetwork: ${hre.network.name}`);
        console.log(`==== Minting BNotes in Batch ====`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`Token IDs: ${tokenIds.join(', ')}`);
        console.log(`Quantities: ${quantities.join(', ')}`);
        console.log(`From: ${from}`);

        // Dynamically import types to avoid circular dependency
        const { BNote__factory, ERC20__factory } = require('../typechain-types');

        // Verify token is set up for payments
        const proxyAddress = await getBNoteProxyAddress(hre.network.name);
        console.log(`\nConnecting to BNote at: ${proxyAddress}`);

        const bNote = BNote__factory.connect(proxyAddress, hre.ethers.provider);


        // Check if token is a valid payment option
        const paymentToken = await bNote.paymentTokens(tokenAddress);
        if (!paymentToken.active) {
            throw new Error(`Token ${tokenAddress} is not an active payment token`);
        }

        console.log(`Payment token price: ${paymentToken.unitMintPrice} minor units per token`);

        // Calculate total cost
        let totalTokens = 0n;
        for (let i = 0; i < tokenIds.length; i++) {
            totalTokens += BigInt(tokenIds[i] * quantities[i]);
        }

        const totalCost = paymentToken.unitMintPrice * totalTokens;
        console.log(`Total cost: ${totalCost} token minor units`);

        // Check if treasury is set
        const treasury = await bNote.treasury();
        if (treasury === hre.ethers.ZeroAddress) {
            throw new Error('Treasury not set on contract. Minting will fail until treasury is set.');
        }

        // Get token info (optional, for better UX)
        const tokenContract = ERC20__factory.connect(tokenAddress, hre.ethers.provider);

        const allowance: bigint = await tokenContract.allowance(from, proxyAddress);

        if (allowance < totalCost) {
            console.log(
                '\n==================== !!! ABORTING !!! ====================\n'
                + `Address specified as from(${
                    from
                }) does not have enough allowance(${
                    allowance
                }) on paymentToken(${
                    tokenAddress
                }) to pay for minting batch tokenIds(${
                    tokenIds.join(', ')
                }) with quantities(${
                    quantities.join(', ')
                }) with total cost(${
                    totalCost
                }).`
                + `Attempting to mint-batch with this address will revert onchain and waste gas!`
            )
            throw new Error(
                'Sender Insufficient Allowance on Payment Token'
            )
        }

        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        console.log(`Token: ${symbol} (${decimals} decimals)`);
        console.log(`Total cost in major units: ${hre.ethers.formatUnits(totalCost, decimals)} ${symbol}`);


        // Create the transaction data
        const txData = bNote.interface.encodeFunctionData(
            'mintBatch',
            [tokenIds, quantities, tokenAddress],
        );

        const transactions = [{
            to: proxyAddress,
            value: '0',
            data: txData,
            transactionInfoLog: `\n==== Mint Batch Transaction ====`,
        }];

        await askForConfirmation(
            `Do you want to proceed with minting ${tokenIds.map((id, i) => `${quantities[i]} of tokenId ${id}`).join(', ')}?\n`
            + `This will cost approximately ${totalCost} minor units`
            + (symbol ? ` (${hre.ethers.formatUnits(totalCost, decimals)} ${symbol})` : '')
            + ` paid from address ${from}.`,
        );

        if (dryRun || !CONFIG.proposeTxToSafe) {
            logTransactionDetailsToConsole(transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });