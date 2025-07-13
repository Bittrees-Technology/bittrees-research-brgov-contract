import { task, types } from 'hardhat/config';
import { CONFIG } from '@project/config';
import {
    askForConfirmation,
    proposeTxBundleToSafe,
    logTransactionDetailsToConsole,
    getContractProxyAddress, contractNameParam, getBittreesResearchContract,
} from '@project/lib/helpers';
import { transactionBatch, TTransaction } from '@project/lib/tx-batch';

// TODO generalize more and move BNote minting specific checks up to the BNote task which calls this task
/**
 * Generalized Task for batch minting ERC1155s
 * */
task('mint-batch', 'Mints multiple ERC1155s in one transaction')
    .addParam('contractName', 'The name of the contract to grant the role on', undefined, contractNameParam)
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
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const {
            contractName,
            tokenAddress,
            tokenIds: tokenIdsString,
            quantities: quantitiesString,
            from,
            dryRun,
            omitDefensiveChecks,
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
        console.log(`==== Minting Batch ====`);
        console.log(`Token Address: ${tokenAddress}`);
        console.log(`Token IDs: ${tokenIds.join(', ')}`);
        console.log(`Quantities: ${quantities.join(', ')}`);
        console.log(`From: ${from}`);

        // Dynamically import types to avoid circular dependency
        const { ERC20__factory } = require('@project/typechain-types');

        // Verify token is set up for payments
        const proxyAddress = await getContractProxyAddress(contractName, hre.network.name);

        const contract = await getBittreesResearchContract(contractName, proxyAddress, hre);


        // Check if token is a valid payment option
        const paymentToken = await contract.paymentTokens(tokenAddress);
        if (!paymentToken.active && !omitDefensiveChecks) {
            throw new Error(`Token ${tokenAddress} is not an active payment token`);
        }

        if (omitDefensiveChecks) {
            console.log('⚠️price may inaccurate if task was run using the omitDefensiveChecks flag')
        }
        console.log(`Payment token price: ${paymentToken.unitMintPrice} minor units per token`);

        // Calculate total cost
        let totalTokens = 0n;
        for (let i = 0; i < tokenIds.length; i++) {
            totalTokens += BigInt(tokenIds[i] * quantities[i]);
        }

        if (omitDefensiveChecks) {
            console.log('⚠️price may inaccurate if task was run using the omitDefensiveChecks flag')
        }
        const totalCost = paymentToken.unitMintPrice * totalTokens;
        console.log(`Total cost: ${totalCost} token minor units`);

        // Check if treasury is set
        const treasury = await contract.treasury();
        if (treasury === hre.ethers.ZeroAddress && !omitDefensiveChecks) {
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
                + `Attempting to mint-batch with this address will revert onchain and waste gas!`,
            );
            throw new Error(
                'Sender Insufficient Allowance on Payment Token',
            );
        }

        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        console.log(`Token: ${symbol} (${decimals} decimals)`);
        console.log(`Total cost in major units: ${hre.ethers.formatUnits(totalCost, decimals)} ${symbol}`);


        // Create the transaction data
        const txData: string = contract.interface.encodeFunctionData(
            'mintBatch',
            [tokenIds, quantities, tokenAddress],
        );

        const transactions: TTransaction[] = [{
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
            transactionBatch.push(...transactions);
        } else {
            await proposeTxBundleToSafe(hre, transactions, from);
        }
    });