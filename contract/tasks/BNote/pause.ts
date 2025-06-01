import { task } from 'hardhat/config';
import { CONFIG } from '@project/config';
import { BittreesResearchContractNames } from '@project/lib/helpers';

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Technology Multisig pauses the BNote contract
 * */
task(
    'BNOTE-technology-pause',
    'Bittrees Technology Multisig pauses the BNote contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause', {
            contractName: BittreesResearchContractNames.BNOTE,
            from: CONFIG.bittreesTechnologyGnosisSafeAddress,
            dryRun,
        });
    });

/**
 * Contract Configuration Helper Task
 *
 * The Bittrees Research Multisig pauses the BNote contract
 * */
task(
    'BNOTE-research-pause',
    'Bittrees Research Multisig pauses the BNote contract',
)
    .addFlag('dryRun', 'Add transactions to transactionBatch global without submitting and log')
    .setAction(async (taskArgs, hre) => {
        const { dryRun } = taskArgs;

        await hre.run('pause', {
            contractName: BittreesResearchContractNames.BNOTE,
            from: CONFIG.bittreesResearchGnosisSafeAddress,
            dryRun,
        });
    });