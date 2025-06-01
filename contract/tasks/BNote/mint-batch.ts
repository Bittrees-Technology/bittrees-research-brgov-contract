import { task, types } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Technology Multisig mints BNotes using the mintBatch function.
 * */
task(
    'BNOTE-technology-mint-batch-test',
    'Bittrees Technology Multisig mints BNotes using the mintBatch function',
)
    .addOptionalParam(
        'tokenAddress',
        'The address of the ERC20 token used for payment',
        undefined,
        types.string,
    )
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
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress = CONFIG.network[
                hre.network.name as keyof typeof CONFIG.network
                ].paymentTokens.BTREE.contractAddress,
            tokenIds,
            quantities,
            dryRun,
            omitDefensiveChecks,
        } = taskArgs;

        await hre.run('mint-batch', {
            contractName: BittreesResearchContractNames.BNOTE,
            tokenAddress,
            tokenIds,
            quantities,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Research Multisig mints BNotes using the mintBatch function.
 * */
task(
    'BNOTE-research-mint-batch-test',
    'Bittrees Research Multisig mints BNotes using the mintBatch function',
)
    .addOptionalParam(
        'tokenAddress',
        'The address of the ERC20 token used for payment',
        undefined,
        types.string,
    )
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
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .addFlag(
        'omitDefensiveChecks',
        '⚠️⚠️⚠️DANGEROUS!!! Omit defensive checks which block this task completing. Used for creating a tx which ' +
        'will only be run in the future once it is valid. Executing this tx before intended could have bad consequences.'
    )
    .setAction(async (taskArgs, hre) => {
        const {
            tokenAddress = CONFIG.network[
                hre.network.name as keyof typeof CONFIG.network
                ].paymentTokens.BTREE.contractAddress,
            tokenIds,
            quantities,
            dryRun,
            omitDefensiveChecks,
        } = taskArgs;

        await hre.run('mint-batch', {
            contractName: BittreesResearchContractNames.BNOTE,
            tokenAddress,
            tokenIds,
            quantities,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
            omitDefensiveChecks,
        });
    });